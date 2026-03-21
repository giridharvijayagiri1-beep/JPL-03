// src/pages/user/LiveMatchDetails.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

function LiveMatchDetails({ onBack }) {
  const [liveData, setLiveData] = useState(null);
  const [teams, setTeams] = useState({ teamA: null, teamB: null });
  const [error, setError] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const liveMatchRef = doc(db, 'liveMatch', 'current');
    const unsubscribe = onSnapshot(liveMatchRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveData(data);
        if (data.status !== 'live') onBack();
      } else {
        onBack();
      }
    }, (err) => setError("Connection lost."));
    return () => unsubscribe();
  }, [onBack]);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!liveData || liveData.status !== 'live') return;
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
      } catch (err) {}
    };
    fetchTeams();
  }, [liveData?.teamAId, liveData?.teamBId, liveData?.status]);

  // Auto-trigger celebration when 2nd innings completes (MUST be before early returns)
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

  if (error) return <div className="p-10 text-center text-red-500 animate-fade-in text-sm font-bold uppercase">{error}</div>;
  if (!liveData) return <div className="p-10 text-center text-white text-sm font-bold uppercase animate-pulse">Loading Telemetry...</div>;

  // Derived state
  const totalBalls = liveData.balls || 0;
  const isSecondInnings = liveData.innings === 2;
  const targetChased = isSecondInnings && liveData.scores >= (liveData.targetScore || Infinity);
  const isMaxOvers = totalBalls >= 60;
  const isMaxWickets = liveData.wickets >= 10;
  const isSecondInningsComplete = isSecondInnings && (isMaxOvers || isMaxWickets || targetChased);
  const isFirstInningsComplete = !isSecondInnings && (isMaxOvers || isMaxWickets);

  // Compute winner
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

  // Confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: `${4 + Math.random() * 8}px`,
    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF69B4', '#00FF7F', '#FF4500'][i % 10],
  }));

  // Analytics Helpers
  const crr = totalBalls > 0 ? (liveData.scores / (totalBalls / 6)).toFixed(1) : '0.0';
  let rrr = '0.0';
  if (isSecondInnings) {
    const runsNeeded = (liveData.targetScore || 0) - (liveData.scores || 0);
    const ballsRemaining = Math.max(0, 60 - totalBalls);
    if (runsNeeded <= 0) rrr = '0.0';
    else if (ballsRemaining > 0) rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(1);
    else rrr = '∞';
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 w-full">

      {/* === CELEBRATION OVERLAY === */}
      {showCelebration && winnerInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
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

          <div className="relative z-10 flex flex-col items-center px-8 py-10 w-[90vw] max-w-[380px] rounded-[36px] border border-yellow-500/30 shadow-[0_0_80px_rgba(255,215,0,0.15)]" style={{ backgroundColor: 'rgba(20,15,10,0.95)', animation: 'slideUp 0.6s ease-out' }}>
            <div className="text-7xl mb-4" style={{ animation: 'trophyGlow 2s ease-in-out infinite' }}>🏆</div>

            {winnerInfo.isDraw ? (
              <>
                <h2 className="text-3xl font-black text-yellow-400 tracking-tight text-center" style={{ animation: 'celebPulse 2s ease-in-out infinite' }}>MATCH DRAWN!</h2>
                <p className="text-white/60 text-xs uppercase tracking-[0.3em] font-bold mt-3">What a contest!</p>
              </>
            ) : (
              <>
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

            <button
              onClick={() => setShowCelebration(false)}
              className="mt-8 w-full py-3.5 rounded-[16px] bg-yellow-500 text-black font-black text-xs uppercase tracking-wider active:scale-95 shadow-[0_4px_20px_rgba(255,215,0,0.4)] transition-all"
            >
              Continue Watching
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 px-2">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-theme-card flex items-center justify-center border border-white/5 active:scale-95 transition-transform text-white shadow-sm z-10">
          <span className="text-xl">←</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Detailed Score</h2>
          <p className="text-theme-text/60 text-[10px] uppercase font-bold tracking-widest mt-1">Live Match Analytics</p>
        </div>
      </div>

      <div className="bg-theme-card p-6 mx-1 rounded-[32px] border border-theme-primary/40 shadow-[0_8px_32px_rgba(10,132,255,0.15)] relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 bg-red-500/10 px-4 py-2 rounded-bl-[24px] border-l border-b border-red-500/20 backdrop-blur-md z-20">
          <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 drop-shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            LIVE
          </span>
        </div>
        <h3 className="text-[10px] font-black mb-5 text-center mt-2 text-theme-text/40 uppercase tracking-[0.3em]">
          Match #{liveData?.matchNumber || '...'}
        </h3>

        {/* Google-style scorecard rows */}
        {(() => {
          // Figure out which team batted first (1st innings) and which is batting now
          const firstBattingTeamId = isSecondInnings 
            ? (liveData.battingTeam === liveData.teamAId ? liveData.teamBId : liveData.teamAId)
            : liveData.battingTeam;
          const secondBattingTeamId = isSecondInnings ? liveData.battingTeam : null;

          const firstBattingTeam = firstBattingTeamId === liveData.teamAId ? teams.teamA : teams.teamB;
          const secondBattingTeam = secondBattingTeamId 
            ? (secondBattingTeamId === liveData.teamAId ? teams.teamA : teams.teamB)
            : null;

          const firstBowlingTeam = firstBattingTeamId === liveData.teamAId ? teams.teamB : teams.teamA;

          // 1st innings data
          const firstInningsScore = isSecondInnings ? (liveData.firstInningsScore || 0) : (liveData.scores || 0);
          const firstInningsWickets = isSecondInnings ? (liveData.firstInningsWickets || 0) : (liveData.wickets || 0);
          const firstInningsOvers = isSecondInnings ? (liveData.firstInningsOvers || '0.0') : (liveData.overs || '0.0');

          // 2nd innings data
          const secondInningsScore = isSecondInnings ? (liveData.scores || 0) : null;
          const secondInningsWickets = isSecondInnings ? (liveData.wickets || 0) : null;
          const secondInningsOvers = isSecondInnings ? (liveData.overs || '0.0') : null;

          const renderTeamRow = (team, teamId, score, wickets, overs, isBatting, isCurrentInnings) => (
            <div className={`flex items-center gap-3 p-3 rounded-[16px] transition-all ${isBatting && isCurrentInnings ? 'bg-theme-primary/[0.08] border border-theme-primary/20' : 'bg-white/[0.02] border border-transparent'}`}>
              {/* Logo */}
              <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border text-[9px] font-black ${isBatting && isCurrentInnings ? 'border-theme-primary shadow-[0_0_12px_rgba(10,132,255,0.3)]' : 'border-white/10'}`}>
                {team?.logoUrl && team.logoUrl !== 'default-logo.png' ? (
                  <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-theme-text/60">{team?.name?.substring(0,3)?.toUpperCase() || '???'}</span>
                )}
              </div>
              {/* Name + batting icon */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-[16px] truncate ${isBatting && isCurrentInnings ? 'text-white' : 'text-theme-text/70'}`}>
                    {team?.name || 'Team'}
                  </span>
                  {isBatting && isCurrentInnings && <span className="text-sm">🏏</span>}
                </div>
                {overs !== null && (
                  <span className="text-[13px] text-theme-text/50 font-semibold">{overs} ov</span>
                )}
              </div>
              {/* Score */}
              {score !== null ? (
                <div className="text-right shrink-0">
                  <span className={`text-2xl font-black tracking-tight ${isBatting && isCurrentInnings ? 'text-white' : 'text-theme-text/70'}`}>
                    {score}<span className="text-theme-text/20 mx-0.5 text-lg font-light">/</span>{wickets}
                  </span>
                </div>
              ) : (
                <span className="text-theme-text/20 text-sm font-bold">Yet to bat</span>
              )}
            </div>
          );

          return (
            <div className="flex flex-col gap-1">
              {/* 1st batting team row */}
              {renderTeamRow(firstBattingTeam, firstBattingTeamId, firstInningsScore, firstInningsWickets, firstInningsOvers, !isSecondInnings && !isFirstInningsComplete, !isSecondInnings && !isFirstInningsComplete)}
              {/* Divider */}
              <div className="h-px bg-white/5 mx-3"></div>
              {/* 2nd batting / bowling team row */}
              {renderTeamRow(
                isSecondInnings ? secondBattingTeam : firstBowlingTeam,
                isSecondInnings ? secondBattingTeamId : (firstBattingTeamId === liveData.teamAId ? liveData.teamBId : liveData.teamAId),
                secondInningsScore,
                secondInningsWickets,
                secondInningsOvers,
                isSecondInnings,
                isSecondInnings
              )}
            </div>
          );
        })()}

        {/* Target / Need info */}
        {liveData?.targetScore && (
          <div className="mt-4 flex justify-center">
            {isSecondInningsComplete && winnerInfo ? (
              <div className={`border px-5 py-3 rounded-[16px] flex items-center justify-center gap-2 w-full mx-2 ${winnerInfo.isDraw ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <span className="text-lg">{winnerInfo.isDraw ? '🤝' : '🏆'}</span>
                <span className={`text-[13px] font-black tracking-widest uppercase ${winnerInfo.isDraw ? 'text-yellow-400' : 'text-green-400'}`}>
                  {winnerInfo.isDraw ? 'Match Drawn!' : `${winnerInfo.winner?.name || 'Winner'} Won by ${winnerInfo.margin}`}
                </span>
              </div>
            ) : targetChased ? (
              <div className="bg-blue-500/10 border border-blue-500/30 px-5 py-3 rounded-[16px] flex items-center justify-center gap-2 w-full mx-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0"></span>
                <span className="text-[13px] font-black tracking-widest text-blue-400 uppercase">Target Chased!</span>
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

      {/* Innings Break Indicator */}
      {isFirstInningsComplete && (
        <>
          <style>{`
            @keyframes breatheGlow {
              0%, 100% { box-shadow: 0 0 15px rgba(10,132,255,0.15), inset 0 0 15px rgba(10,132,255,0.05); }
              50% { box-shadow: 0 0 30px rgba(10,132,255,0.3), inset 0 0 25px rgba(10,132,255,0.1); }
            }
            @keyframes shimmer {
              0% { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            @keyframes ringPulse {
              0%, 100% { transform: scale(1); opacity: 0.6; }
              50% { transform: scale(1.15); opacity: 1; }
            }
          `}</style>
          <div 
            className="mx-1 px-6 py-5 rounded-[24px] border border-blue-500/30 bg-theme-card relative overflow-hidden flex items-center gap-4"
            style={{ animation: 'breatheGlow 3s ease-in-out infinite' }}
          >
            <div className="absolute inset-0 opacity-[0.04]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(10,132,255,0.8) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite'
              }}
            ></div>
            
            {/* Pulsing ring icon */}
            <div className="relative shrink-0 z-10 w-10 h-10 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-blue-500/40" style={{ animation: 'ringPulse 2s ease-in-out infinite' }}></span>
              <span className="absolute inset-1 rounded-full border-2 border-blue-400/20" style={{ animation: 'ringPulse 2s ease-in-out infinite 0.4s' }}></span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(10,132,255,0.6)]"></span>
            </div>

            <div className="flex flex-col relative z-10 min-w-0">
              <span className="text-white font-black text-[15px] tracking-tight whitespace-nowrap">Innings Break</span>
            </div>
          </div>
        </>
      )}
      
      {/* Advanced Stats View */}
      <div className="grid grid-cols-2 gap-3 mt-1 mx-2">
        <div className="bg-theme-card p-5 rounded-[24px] border border-white/5 flex flex-col items-center shadow-lg hover:bg-white/[0.02] transition-colors">
          <span className="text-white font-black text-3xl">{isSecondInnings ? rrr : (liveData?.balls || 0)}</span>
          <span className="text-[10px] uppercase tracking-widest text-theme-text/50 font-bold mt-2">
            {isSecondInnings ? 'Req. Run Rate' : 'Total Balls'}
          </span>
        </div>
        <div className="bg-theme-card p-5 rounded-[24px] border border-white/5 flex flex-col items-center shadow-lg hover:bg-white/[0.02] transition-colors">
          <span className="text-white font-black text-3xl">{crr}</span>
          <span className="text-[10px] uppercase tracking-widest text-theme-text/50 font-bold mt-2">
            {isSecondInnings ? 'Curr. Run Rate' : 'Run Rate'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LiveMatchDetails;
