// src/pages/admin/LiveScore.jsx
import React, { useState, useEffect } from 'react';
import { db, endMatchAndProcessResults } from '../../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc, increment } from 'firebase/firestore';

function LiveScore({ onBack }) {
  const [liveData, setLiveData] = useState(null);
  const [teams, setTeams] = useState({ teamA: null, teamB: null });
  const [error, setError] = useState(null);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [processingEnd, setProcessingEnd] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // 1. Fetch liveMatch/current real-time securely
  useEffect(() => {
    // Hide global navigation in control centre
    const nav = document.getElementById('app-navbar');
    if (nav) nav.style.display = 'none';

    const liveMatchRef = doc(db, 'liveMatch', 'current');
    const unsubscribe = onSnapshot(liveMatchRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveData(data);
        setError(null);
        if (data.status === 'idle') onBack(); // Auto-return if cleanly ended
      }
    }, (err) => {
      console.error("Live match sync error:", err);
      setError("Connection lost. Please check your internet connection and try again.");
    });
    
    return () => {
      unsubscribe();
      if (nav) nav.style.display = '';
    };
  }, [onBack]);

  // 2. Fetch Team Metadata safely
  useEffect(() => {
    const fetchTeams = async () => {
      if (!liveData) return;
      try {
        let fetchedTeamA = teams.teamA;
        let fetchedTeamB = teams.teamB;
        let updated = false;

        if (liveData.teamAId && (!teams.teamA || teams.teamA.id !== liveData.teamAId)) {
          const snap = await getDoc(doc(db, 'teams', liveData.teamAId));
          if (snap.exists()) { fetchedTeamA = { id: snap.id, ...snap.data() }; updated = true; }
        }
        if (liveData.teamBId && (!teams.teamB || teams.teamB.id !== liveData.teamBId)) {
          const snap = await getDoc(doc(db, 'teams', liveData.teamBId));
          if (snap.exists()) { fetchedTeamB = { id: snap.id, ...snap.data() }; updated = true; }
        }
        if (updated) setTeams({ teamA: fetchedTeamA, teamB: fetchedTeamB });
      } catch (err) {
        console.error("Fetch teams error:", err);
      }
    };
    fetchTeams();
  }, [liveData?.teamAId, liveData?.teamBId]);

  // Auto-trigger celebration when 2nd innings completes (must be before early returns!)
  useEffect(() => {
    if (!liveData) return;
    const balls = liveData.balls || 0;
    const maxOvers = balls >= 60;
    const maxWickets = liveData.wickets >= 10;
    const is2nd = liveData.innings === 2;
    const chased = is2nd && liveData.scores >= (liveData.targetScore || Infinity);
    const complete = is2nd && (maxOvers || maxWickets || chased);
    if (complete && !showCelebration) {
      setShowCelebration(true);
    }
  }, [liveData?.balls, liveData?.wickets, liveData?.scores, liveData?.innings]);

  if (error) {
    return (
      <div className="p-10 text-center flex flex-col items-center bg-theme-card border border-red-500/20 rounded-[32px] mt-10 shadow-lg">
        <span className="text-red-500 text-4xl mb-4 opacity-80">⚠️</span>
        <h3 className="text-white font-bold mb-2">Network Error</h3>
        <p className="text-theme-text/60 text-sm mb-6">{error}</p>
        <button onClick={onBack} className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 text-white">Return to Dashboard</button>
      </div>
    );
  }

  if (!liveData) return (
    <div className="flex flex-col items-center justify-center p-16 animate-pulse mt-10">
      <div className="w-10 h-10 border-2 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin mb-4"></div>
      <p className="text-theme-text/50 font-medium">Synchronizing Secure Dashboard...</p>
    </div>
  );

  const totalBalls = liveData.balls || 0;
  const isMatchActive = liveData.status === 'live';
  
  // Guard Rails constraints
  const isMaxOvers = totalBalls >= 60; // Max 10 overs
  const isMaxWickets = liveData.wickets >= 10; // Max 10 wickets
  const isSecondInnings = liveData.innings === 2;
  const targetChased = isSecondInnings && liveData.scores >= (liveData.targetScore || Infinity);
  const isSecondInningsComplete = isSecondInnings && (isMaxOvers || isMaxWickets || targetChased);
  const buttonsDisabled = !isMatchActive || isMaxOvers || isMaxWickets || targetChased;

  // Compute winner for celebration
  const getWinnerInfo = () => {
    if (!isSecondInningsComplete) return null;
    const firstInningsScore = liveData.firstInningsScore || 0;
    const secondInningsScore = liveData.scores || 0;
    const battingTeamId = liveData.battingTeam;
    const bowlingTeamId = battingTeamId === liveData.teamAId ? liveData.teamBId : liveData.teamAId;
    const battingTeam = battingTeamId === liveData.teamAId ? teams.teamA : teams.teamB;
    const bowlingTeam = bowlingTeamId === liveData.teamAId ? teams.teamA : teams.teamB;

    if (secondInningsScore >= (liveData.targetScore || Infinity)) {
      return { winner: battingTeam, loser: bowlingTeam, margin: `${10 - (liveData.wickets || 0)} wickets`, firstScore: firstInningsScore, secondScore: secondInningsScore };
    } else if (secondInningsScore < firstInningsScore) {
      return { winner: bowlingTeam, loser: battingTeam, margin: `${firstInningsScore - secondInningsScore} runs`, firstScore: firstInningsScore, secondScore: secondInningsScore };
    } else {
      return { winner: null, isDraw: true, firstScore: firstInningsScore, secondScore: secondInningsScore };
    }
  };
  const winnerInfo = getWinnerInfo();

  // Master scoring transaction
  const handleAction = async (runs, isWicket) => {
    if (buttonsDisabled) return;
    if (isWicket && isMaxWickets) return;

    const newBalls = totalBalls + 1;
    const newOvers = `${Math.floor(newBalls / 6)}.${newBalls % 6}`;

    try {
      const currentHistory = liveData.undoHistory || (liveData.lastAction ? [liveData.lastAction] : []);
      const newAction = { runs, wickets: isWicket ? 1 : 0, balls: 1, type: 'normal', id: Date.now() };
      const nextHistory = [...currentHistory, newAction].slice(-3);

      await updateDoc(doc(db, 'liveMatch', 'current'), {
        scores: increment(runs),
        wickets: increment(isWicket ? 1 : 0),
        balls: increment(1),
        overs: newOvers,
        freeHit: false, // reset free hit after a legal ball
        undoHistory: nextHistory,
        lastAction: newAction
      });
    } catch (err) {
      console.error("Failed to update score transaction:", err);
      alert("System Failed to update. Firebase connection lost.");
    }
  };

  // Extras handler - adds runs WITHOUT counting a ball
  const handleExtra = async (type) => {
    if (!isMatchActive) return;
    try {
      const updates = {
        scores: increment(1),
        extras: increment(1),
      };
      
      const currentHistory = liveData.undoHistory || (liveData.lastAction ? [liveData.lastAction] : []);
      let newAction = {};
      
      if (type === 'wide') {
        newAction = { runs: 1, wickets: 0, balls: 0, type: 'wide', id: Date.now() };
      } else if (type === 'noball') {
        updates.freeHit = true;
        newAction = { runs: 1, wickets: 0, balls: 0, type: 'noball', id: Date.now() };
      }
      
      const nextHistory = [...currentHistory, newAction].slice(-3);
      updates.undoHistory = nextHistory;
      updates.lastAction = newAction;
      
      await updateDoc(doc(db, 'liveMatch', 'current'), updates);
    } catch (err) {
      console.error("Failed to process extra:", err);
    }
  };

  const handleUndo = async () => {
    const history = liveData.undoHistory || (liveData.lastAction ? [liveData.lastAction] : []);
    if (!history.length || !isMatchActive) return;
    
    // Get the most recent action to undo
    const targetAction = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    const { runs, wickets, balls, type } = targetAction;
    const undoUpdates = {
      scores: increment(-runs),
      wickets: increment(-wickets),
      undoHistory: newHistory,
      lastAction: newHistory.length > 0 ? newHistory[newHistory.length - 1] : null,
    };

    if (balls > 0) {
      const newBalls = Math.max(0, totalBalls - balls);
      const newOvers = `${Math.floor(newBalls / 6)}.${newBalls % 6}`;
      undoUpdates.balls = increment(-balls);
      undoUpdates.overs = newOvers;
    }

    if (type === 'wide' || type === 'noball') {
      undoUpdates.extras = increment(-1);
    }
    if (type === 'noball') {
      undoUpdates.freeHit = false;
    }

    try {
      await updateDoc(doc(db, 'liveMatch', 'current'), undoUpdates);
    } catch (err) {
      console.error("Failed to sequence undo transaction:", err);
    }
  };

  const handleMinusOne = async () => {
    if (!isMatchActive || (liveData?.scores || 0) <= 0) return;
    try {
      await updateDoc(doc(db, 'liveMatch', 'current'), {
        scores: Math.max(0, liveData.scores - 1)
      });
    } catch (err) {
      console.error("Failed to process -1 adjustment:", err);
    }
  };

  const handleMinusOneBall = async () => {
    if (!isMatchActive || (liveData?.balls || 0) <= 0) return;
    try {
      const newBalls = Math.max(0, liveData.balls - 1);
      const newOvers = `${Math.floor(newBalls / 6)}.${newBalls % 6}`;
      await updateDoc(doc(db, 'liveMatch', 'current'), {
        balls: newBalls,
        overs: newOvers
      });
    } catch (err) {
      console.error("Failed to process -1 ball adjustment:", err);
    }
  };

  const handleMinusOneWicket = async () => {
    if (!isMatchActive || (liveData?.wickets || 0) <= 0) return;
    try {
      await updateDoc(doc(db, 'liveMatch', 'current'), {
        wickets: Math.max(0, liveData.wickets - 1)
      });
    } catch (err) {
      console.error("Failed to process -1 wicket:", err);
    }
  };

  const handleStartSecondInnings = async () => {
    if (!liveData) return;
    const liveMatchRef = doc(db, 'liveMatch', 'current');
    const nextBattingTeam = liveData.battingTeam === liveData.teamAId ? liveData.teamBId : liveData.teamAId;
    await updateDoc(liveMatchRef, {
      innings: 2,
      targetScore: liveData.scores + 1,
      firstInningsScore: liveData.scores,
      firstInningsWickets: liveData.wickets,
      firstInningsOvers: liveData.overs,
      battingTeam: nextBattingTeam,
      scores: 0,
      wickets: 0,
      balls: 0,
      overs: '0.0',
      lastAction: null
    });
  };

  const handleEndMatch = async () => {
    setProcessingEnd(true);
    try {
      await endMatchAndProcessResults(liveData);
      setShowCelebration(false);
      onBack();
    } catch (error) {
      console.error("Failed to sequence Match Finalizer Engine:", error);
      setError("A critical error occurred while tallying results. Please try again.");
      setProcessingEnd(false);
      setShowConfirmEnd(false);
      setShowCelebration(false);
    }
  };


  // Generate confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: `${4 + Math.random() * 8}px`,
    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF69B4', '#00FF7F', '#FF4500'][i % 10],
  }));

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 w-full max-w-md mx-auto" style={{ zoom: 0.82, transformOrigin: 'top center' }}>

      {/* === CELEBRATION OVERLAY === */}
      {showCelebration && winnerInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>

          {/* Confetti */}
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            @keyframes celebPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes trophyGlow {
              0%, 100% { filter: drop-shadow(0 0 20px rgba(255,215,0,0.6)); }
              50% { filter: drop-shadow(0 0 40px rgba(255,215,0,1)); }
            }
            @keyframes slideUp {
              0% { transform: translateY(60px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          {confettiParticles.map(p => (
            <div
              key={p.id}
              className="fixed pointer-events-none rounded-sm"
              style={{
                left: p.left,
                top: '-20px',
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                animation: `confettiFall ${p.duration} ${p.delay} linear infinite`,
              }}
            />
          ))}

          {/* Celebration Card */}
          <div className="relative z-10 flex flex-col items-center px-8 py-10 w-[90vw] max-w-[380px] rounded-[36px] border border-yellow-500/30 shadow-[0_0_80px_rgba(255,215,0,0.15)]" style={{ backgroundColor: 'rgba(20,15,10,0.95)', animation: 'slideUp 0.6s ease-out' }}>

            {/* Trophy */}
            <div className="text-7xl mb-4" style={{ animation: 'trophyGlow 2s ease-in-out infinite' }}>🏆</div>

            {winnerInfo.isDraw ? (
              <>
                <h2 className="text-3xl font-black text-yellow-400 tracking-tight text-center" style={{ animation: 'celebPulse 2s ease-in-out infinite' }}>MATCH DRAWN!</h2>
                <p className="text-white/60 text-xs uppercase tracking-[0.3em] font-bold mt-3">What a contest!</p>
              </>
            ) : (
              <>
                {/* Winner Logo */}
                {winnerInfo.winner?.logoUrl && winnerInfo.winner.logoUrl !== 'default-logo.png' && (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(255,215,0,0.3)] mb-3">
                    <img src={winnerInfo.winner.logoUrl} alt={winnerInfo.winner.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <h2 className="text-2xl font-black text-yellow-400 tracking-tight text-center uppercase leading-tight px-4" style={{ animation: 'celebPulse 2s ease-in-out infinite' }}>
                  {winnerInfo.winner?.name} WON BY {winnerInfo.margin}
                </h2>
              </>
            )}

            {/* Score Summary */}
            <div className="mt-6 w-full grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-[16px] p-3 text-center border border-white/5">
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">1st Innings</span>
                <span className="text-white font-black text-lg">{winnerInfo.firstScore}</span>
              </div>
              <div className="bg-white/5 rounded-[16px] p-3 text-center border border-white/5">
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-1">2nd Innings</span>
                <span className="text-white font-black text-lg">{winnerInfo.secondScore}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full mt-8">
              <button
                onClick={() => setShowCelebration(false)}
                className="flex-[0.8] py-3.5 rounded-[16px] bg-white/10 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform border border-white/5"
              >
                Dismiss
              </button>
              <button
                onClick={handleEndMatch}
                disabled={processingEnd}
                className="flex-[1.2] py-3.5 rounded-[16px] bg-yellow-500 text-black font-black text-xs uppercase tracking-wider active:scale-95 shadow-[0_4px_20px_rgba(255,215,0,0.4)] disabled:opacity-50 transition-all"
              >
                {processingEnd ? 'Saving...' : 'Finalize & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header section with back button */}
      <div className="flex items-center gap-4 mt-2">
        <button onClick={onBack} className="w-11 h-11 rounded-full bg-theme-card flex items-center justify-center border border-white/5 shadow-md active:scale-90 transition-all text-white hover:bg-white/[0.02]">
          <span className="text-xl font-bold pr-[2px]">←</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Control Center
          </h2>
          <p className="text-theme-text/50 text-[11px] uppercase tracking-widest font-bold mt-0.5">Live Transactions</p>
        </div>
      </div>

      {/* Main Score Display Area */}
      <div className={`bg-theme-card p-4 rounded-[28px] border transition-all duration-300 shadow-[0_8px_32px_rgba(10,132,255,0.15)] relative mt-2 
        ${isMaxOvers || isMaxWickets || targetChased ? 'border-red-500/30' : 'border-theme-primary/30'}`}>
        
        <div className="flex justify-between items-center mb-4 px-1">
          
          <div className={`p-3 rounded-[16px] transition-all flex flex-col items-center flex-1 shadow-inner
            ${liveData.battingTeam === liveData.teamAId ? 'bg-theme-primary/10 border border-theme-primary/30 scale-105' : 'bg-white/5 border border-transparent opacity-60'}`}>
            <span className={`font-black text-sm text-center uppercase tracking-widest ${liveData.battingTeam === liveData.teamAId ? 'text-theme-primary' : 'text-theme-text'}`}>
              {teams.teamA?.name || 'Local'}
            </span>
            <span className={`mt-1 text-base leading-none`}>
              {liveData.battingTeam === liveData.teamAId ? '🏏' : '⚾'}
            </span>
          </div>
          
          <span className="text-[10px] text-theme-text/30 font-black uppercase tracking-[0.3em] mx-3">VS</span>
          
          <div className={`p-3 rounded-[16px] transition-all flex flex-col items-center flex-1 shadow-inner
            ${liveData.battingTeam === liveData.teamBId ? 'bg-theme-primary/10 border border-theme-primary/30 scale-105' : 'bg-white/5 border border-transparent opacity-60'}`}>
            <span className={`font-black text-sm text-center uppercase tracking-widest ${liveData.battingTeam === liveData.teamBId ? 'text-theme-primary' : 'text-theme-text'}`}>
              {teams.teamB?.name || 'Away'}
            </span>
            <span className={`mt-1 text-base leading-none`}>
              {liveData.battingTeam === liveData.teamBId ? '🏏' : '⚾'}
            </span>
          </div>

        </div>

        <div className="text-center my-4">
          <span className="text-7xl font-black text-white tracking-tighter drop-shadow-lg flex items-center justify-center leading-none">
            {liveData.scores}<span className="text-theme-text/20 font-light mx-2 text-6xl">/</span>{liveData.wickets}
          </span>
          <div className="mt-4 flex justify-center">
            <div className={`border px-6 py-3 rounded-full shadow-inner flex items-center justify-center min-w-[120px] ${isMaxOvers || isMaxWickets || targetChased ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
              <span className={`text-lg font-black tracking-widest uppercase ${isMaxOvers || isMaxWickets || targetChased ? 'text-red-400' : 'text-theme-primary'}`}>
                {liveData.overs || '0.0'} Ov
              </span>
            </div>
          </div>
          {isSecondInnings && liveData.targetScore && (
            <div className="mt-4 flex justify-center">
              {isSecondInningsComplete && winnerInfo ? (
                <div className={`border px-5 py-3 rounded-[16px] flex items-center justify-center gap-2 w-full mx-2 ${winnerInfo.isDraw ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  <span className="text-lg">{winnerInfo.isDraw ? '🤝' : '🏆'}</span>
                  <span className={`text-[13px] font-black tracking-widest uppercase ${winnerInfo.isDraw ? 'text-yellow-400' : 'text-green-400'}`}>
                    {winnerInfo.isDraw ? 'Match Drawn!' : `${winnerInfo.winner?.name || 'Winner'} Won by ${winnerInfo.margin}`}
                  </span>
                </div>
              ) : (
                <div className="bg-blue-500/5 border border-blue-500/20 px-4 py-3 rounded-[16px] flex items-center justify-center gap-x-3 w-full mx-2">
                  <span className="text-[13px] font-black tracking-widest text-theme-text/60 uppercase">Need <span className="text-blue-400 ml-0.5 text-base">{Math.max(0, liveData.targetScore - liveData.scores)}</span></span>
                  <span className="text-[13px] font-black tracking-widest text-theme-text/30 uppercase">IN</span>
                  <span className="text-[13px] font-black tracking-widest text-theme-text/60 uppercase"><span className="text-blue-400 mr-0.5 text-base">{Math.max(0, 60 - totalBalls)}</span> Balls</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Automatic Intelligent Status Indicators */}
        {(isMaxOvers || isMaxWickets || targetChased) && (
           <div className="text-center mt-6 animate-fade-in relative z-10">
             <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border shadow-md flex inline-flex items-center gap-2 ${targetChased ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
               <span className={`w-1.5 h-1.5 rounded-full animate-ping ${targetChased ? 'bg-blue-500' : 'bg-red-500'}`}></span>
               {targetChased ? 'Target Chased!' : 'Innings Complete'}
             </span>
           </div>
        )}
      </div>

      {/* Admin Action Buttons Panel */}
      <div className={`bg-theme-card p-4 rounded-[28px] mt-3 border border-white/5 shadow-md transition-all duration-300 
         ${buttonsDisabled ? 'opacity-40 grayscale-[80%] scale-[0.98]' : 'hover:border-white/10'}`}>
        <h3 className="text-xs font-black mb-4 text-theme-text/40 uppercase tracking-[0.3em] text-center flex items-center justify-center gap-3">
          <span className="h-px bg-white/5 flex-1 w-full"></span>
          Control Input
          <span className="h-px bg-white/5 flex-1 w-full"></span>
        </h3>
        
        {/* Runs Interface Grid */}
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(run => (
             <button 
               key={`run-${run}`}
               disabled={buttonsDisabled} 
               onClick={() => handleAction(run, false)} 
               className="bg-white/5 hover:bg-white/10 active:bg-white/20 active:scale-90 py-3 rounded-[16px] font-black text-2xl transition-all border border-white/5 text-theme-text shadow-sm disabled:opacity-50"
             >
               {run}
             </button>
          ))}
          
          <button disabled={buttonsDisabled} onClick={() => handleAction(4, false)} className="col-span-2 bg-theme-primary/10 text-theme-primary active:scale-95 py-3.5 rounded-[16px] font-black text-xl transition-all border border-theme-primary/20 hover:bg-theme-primary/20 shadow-inner tracking-widest">
            4 RUNS
          </button>
          <button disabled={buttonsDisabled} onClick={() => handleAction(6, false)} className="col-span-2 bg-theme-primary text-white active:scale-95 py-3.5 rounded-[16px] font-black text-xl transition-all shadow-[0_4px_20px_rgba(10,132,255,0.4)] hover:shadow-[0_4px_24px_rgba(10,132,255,0.5)] border border-theme-primary tracking-widest">
            6 RUNS
          </button>
        </div>

        {/* System Utility Interface Group */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button disabled={buttonsDisabled || isMaxWickets} onClick={() => handleAction(0, true)} className="bg-white/5 text-white active:scale-95 py-3.5 rounded-[16px] font-black text-base tracking-widest transition-all border border-white/5 hover:bg-white/10 shadow-inner">
            WICKET
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleUndo} 
              disabled={(!liveData?.undoHistory?.length && !liveData?.lastAction) || !isMatchActive || buttonsDisabled} 
              title="Undo Last Action"
              className="bg-white/5 text-theme-text/80 disabled:opacity-30 disabled:grayscale active:scale-95 py-3.5 rounded-[16px] font-black text-2xl tracking-widest transition-all border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-white/10">
              <span className="leading-none mb-0.5 text-2xl">↩</span>
            </button>
            <button 
              onClick={handleMinusOne} 
              disabled={!isMatchActive || buttonsDisabled || (liveData?.scores || 0) <= 0} 
              title="Subtract 1 Run"
              className="bg-white/5 text-red-400 disabled:opacity-30 disabled:grayscale active:scale-95 py-3.5 rounded-[16px] font-black text-2xl tracking-widest transition-all border border-white/5 flex flex-col items-center justify-center shadow-inner hover:bg-white/10 hover:text-red-300">
              -1
            </button>
          </div>
          
          <button 
            onClick={handleMinusOneBall} 
            disabled={!isMatchActive || buttonsDisabled || (liveData?.balls || 0) <= 0} 
            title="Subtract 1 Ball"
            className="col-span-1 bg-white/5 text-orange-400 disabled:opacity-30 disabled:grayscale active:scale-95 py-3.5 rounded-[16px] font-black text-base tracking-widest transition-all border border-white/5 flex items-center justify-center shadow-inner hover:bg-white/10 hover:text-orange-300">
            -1 BALL
          </button>
          
          <button 
            onClick={handleMinusOneWicket} 
            disabled={!isMatchActive || buttonsDisabled || (liveData?.wickets || 0) <= 0} 
            title="Subtract 1 Wicket"
            className="col-span-1 bg-white/5 text-purple-400 disabled:opacity-30 disabled:grayscale active:scale-95 py-3.5 rounded-[16px] font-black text-base tracking-widest transition-all border border-white/5 flex items-center justify-center shadow-inner hover:bg-white/10 hover:text-purple-300">
            -1 WKT
          </button>
        </div>

        {/* Extras Section */}
        <h3 className="text-xs font-black mt-4 mb-3 text-theme-text/40 uppercase tracking-[0.3em] text-center flex items-center justify-center gap-3">
          <span className="h-px bg-white/5 flex-1 w-full"></span>
          Extras
          <span className="h-px bg-white/5 flex-1 w-full"></span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <button 
            disabled={!isMatchActive || buttonsDisabled}
            onClick={() => handleExtra('wide')} 
            className="bg-white/5 text-theme-text/80 active:scale-95 py-3.5 rounded-[16px] font-black text-xs tracking-widest transition-all border border-white/5 hover:bg-white/10 shadow-inner disabled:opacity-50 flex flex-col items-center gap-1">
            <span className="text-xl leading-none">↔</span>
            WIDE
          </button>
          <button 
            disabled={!isMatchActive || buttonsDisabled}
            onClick={() => handleExtra('noball')} 
            className="bg-white/5 text-theme-text/80 active:scale-95 py-3.5 rounded-[16px] font-black text-xs tracking-widest transition-all border border-white/5 hover:bg-white/10 shadow-inner disabled:opacity-50 flex flex-col items-center gap-1">
            <span className="text-xl leading-none">⊘</span>
            NO BALL
          </button>
          <div className={`py-3.5 rounded-[16px] font-black text-xs tracking-widest border flex flex-col items-center justify-center gap-1 transition-all ${liveData?.freeHit ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse' : 'bg-white/5 text-theme-text/30 border-white/5'}`}>
            <span className="text-xl leading-none">🔥</span>
            FREE HIT
          </div>
        </div>

        {/* Extras Counter */}
        {(liveData?.extras || 0) > 0 && (
          <div className="mt-3 text-center">
            <span className="text-[9px] font-black text-theme-text/40 uppercase tracking-[0.2em] bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
              Total Extras: <span className="text-white">{liveData.extras}</span>
            </span>
          </div>
        )}
      </div>

      {/* Primary Finalizer / Destructive Action */}
      {(isMaxOvers || isMaxWickets) && (liveData?.innings === 1 || !liveData?.innings) && (
        <button 
          onClick={handleStartSecondInnings} 
          className="mt-2 mb-2 bg-blue-500/10 text-blue-500 border border-blue-500/30 font-black tracking-widest uppercase px-6 py-5 rounded-[24px] w-full active:scale-95 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)] hover:bg-blue-500/20">
          Start 2nd Innings
        </button>
      )}

      {!showConfirmEnd ? (
        <button 
          onClick={() => isSecondInningsComplete ? setShowCelebration(true) : setShowConfirmEnd(true)} 
          disabled={!isMatchActive}
          className={`mt-2 bg-white/5 text-white border border-white/10 font-black tracking-widest uppercase px-6 py-5 rounded-[24px] w-full active:scale-95 transition-all shadow-md 
             ${!isMatchActive ? 'opacity-30' : 'hover:bg-white/10 hover:border-white/20'}`}>
          End active Match
        </button>
      ) : (
        <div className="mt-2 bg-white/5 border border-white/10 p-5 rounded-[24px] flex flex-col items-center shadow-lg animate-fade-in mx-1">
          <p className="text-white font-bold mb-4 text-center tracking-wide text-sm">Finalize Match & Broadcast Results?</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setShowConfirmEnd(false)} disabled={processingEnd} className="flex-[0.8] px-4 py-3.5 rounded-[16px] bg-white/10 text-white font-bold active:scale-95 transition-transform border border-white/5 hover:bg-white/20">Cancel</button>
            <button onClick={handleEndMatch} disabled={processingEnd} className="flex-[1.2] px-4 py-3.5 rounded-[16px] bg-blue-500 text-white font-black uppercase tracking-wider active:scale-95 shadow-[0_4px_15px_rgba(10,132,255,0.4)] disabled:opacity-50 transition-all">
              {processingEnd ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default LiveScore;
