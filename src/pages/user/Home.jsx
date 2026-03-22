// src/pages/user/Home.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, collection, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import TeamCard from '../../components/user/TeamCard';
import FeaturedCarousel from '../../components/user/FeaturedCarousel';

function Home({ onNavigate }) {
  const [liveData, setLiveData] = useState(null);
  const [teams, setTeams] = useState({ teamA: null, teamB: null });
  const [allTeams, setAllTeams] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const liveMatchRef = doc(db, 'liveMatch', 'current');
    const unsubscribe = onSnapshot(liveMatchRef, (docSnap) => {
      if (docSnap.exists()) {
        setLiveData(docSnap.data());
        setError(null);
      } else {
        setLiveData({ status: 'idle' });
      }
    }, (err) => setError("Network offline. Seeking secure connection..."));
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    const fetchAllTeams = async () => {
      try {
        const snap = await getDocs(collection(db, 'teams'));
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setAllTeams(arr);
      } catch (e) {}
    };
    fetchAllTeams();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-theme-card border border-red-500/10 rounded-[32px] text-center animate-fade-in mx-1">
        <span className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4"><span className="text-2xl text-red-500 opacity-80">⚠️</span></span>
        <p className="text-white font-bold mb-2 tracking-wide uppercase text-sm">Offline Mode</p>
        <p className="text-xs text-theme-text/60 font-medium">{error}</p>
      </div>
    );
  }

  const isMatchLive = liveData && liveData.status === 'live';

  const carouselItems = [
    { id: 1, title: "Season 3 Begins", desc: "The ultimate showdown of Jammikunta city cricket.", bg: "bg-blue-500/20 border-blue-500/30", img: "/images/carousel_stadium.png" },
    { id: 2, title: "League Format", desc: "9 elite teams, complete round-robin.", bg: "bg-purple-500/20 border-purple-500/30", img: "/images/carousel_ball.png" },
    { id: 3, title: "Live Dashboards", desc: "Track leading scorers directly live.", bg: "bg-blue-500/20 border-blue-500/30", img: "/images/carousel_dashboard.png" }
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 w-full">
      
      {/* 1. Removed Header */}

      {/* 2. Compact Live Match View - only shown when live */}
      {isMatchLive && (() => {
        const balls = liveData?.balls || 0;
        const is2nd = liveData?.innings === 2;
        const maxOvers = balls >= 60;
        const maxWickets = (liveData?.wickets || 0) >= 10;
        const chased = is2nd && (liveData?.scores || 0) >= (liveData?.targetScore || Infinity);
        const matchComplete = is2nd && (maxOvers || maxWickets || chased);

        // Compute winner for result display
        let resultInfo = null;
        if (matchComplete) {
          const firstScore = liveData?.firstInningsScore || 0;
          const secondScore = liveData?.scores || 0;
          const batId = liveData?.battingTeam;
          const batTeam = batId === liveData?.teamAId ? teams.teamA : teams.teamB;
          const bowlTeam = batId === liveData?.teamAId ? teams.teamB : teams.teamA;
          if (secondScore >= (liveData?.targetScore || Infinity)) {
            resultInfo = { winner: batTeam, margin: `${10 - (liveData?.wickets || 0)} wickets`, firstScore, secondScore };
          } else if (secondScore < firstScore) {
            resultInfo = { winner: bowlTeam, margin: `${firstScore - secondScore} runs`, firstScore, secondScore };
          } else {
            resultInfo = { isDraw: true, firstScore, secondScore };
          }
        }

        if (matchComplete && resultInfo) {
          // === COMPLETED MATCH RESULT CARD ===
          return (
            <div 
              onClick={() => onNavigate && onNavigate('live-score')}
              className="bg-theme-card p-5 mx-2 rounded-[28px] border border-yellow-500/30 shadow-[0_8px_20px_rgba(255,215,0,0.08)] relative overflow-hidden active:scale-95 transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* Winner logo */}
                {resultInfo.isDraw ? (
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10 text-2xl shrink-0">🤝</div>
                ) : (
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-500/40 shadow-[0_0_12px_rgba(255,215,0,0.2)] shrink-0">
                    {resultInfo.winner?.logoUrl && resultInfo.winner.logoUrl !== 'default-logo.png' ? (
                      <img src={resultInfo.winner.logoUrl} alt={resultInfo.winner.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-black">🏆</div>
                    )}
                  </div>
                )}
                {/* Result text */}
                <div className="flex-1 min-w-0">
                  {resultInfo.isDraw ? (
                    <span className="text-yellow-400 font-black text-sm uppercase tracking-wide">Match Drawn</span>
                  ) : (
                    <>
                      <span className="text-yellow-400 font-black text-sm uppercase tracking-wide block truncate">{resultInfo.winner?.name || 'Winner'} Wins!</span>
                      <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-0.5 block">Won by {resultInfo.margin}</span>
                    </>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] bg-white/5 border border-white/10 text-white/60 px-2 py-0.5 rounded-full font-bold tracking-wider whitespace-nowrap">{resultInfo.firstScore} - {resultInfo.secondScore}</span>
                    <span className="text-[9px] text-theme-text/30 font-bold uppercase tracking-widest">Awaiting finalization</span>
                  </div>
                </div>
                {/* Trophy */}
                <span className="text-2xl shrink-0">🏆</span>
              </div>
              <div className="absolute -right-4 -bottom-6 opacity-[0.03] pointer-events-none text-8xl">🏆</div>
            </div>
          );
        }

        // === LIVE MATCH CARD ===
        return (
          <div 
            onClick={() => onNavigate && onNavigate('live-score')}
            className="bg-theme-card p-5 mx-2 rounded-[28px] border border-theme-primary/30 shadow-[0_8px_20px_rgba(10,132,255,0.1)] relative overflow-hidden active:scale-95 transition-transform cursor-pointer group"
          >
            {/* Top: Teams + Score */}
            <div className="flex items-start justify-between z-10 relative">
              <div className="flex flex-col">
                <span className="text-red-500 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 drop-shadow-sm mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
                </span>
                <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                  <span className="text-white font-black text-[13px] flex items-center gap-1 whitespace-nowrap shrink-0">{teams.teamA?.name || 'Team A'}{liveData?.battingTeam === liveData?.teamAId && <span className="text-xs">🏏</span>}</span>
                  <span className="text-theme-text/20 text-[9px] font-black italic shrink-0">VS</span>
                  <span className="text-white font-black text-[13px] flex items-center gap-1 whitespace-nowrap shrink-0">{teams.teamB?.name || 'Team B'}{liveData?.battingTeam === liveData?.teamBId && <span className="text-xs">🏏</span>}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-white tracking-tighter leading-none flex items-baseline">
                  {liveData?.scores || 0}<span className="text-theme-text/30 font-light mx-[1px]">/</span><span className="text-2xl">{liveData?.wickets || 0}</span>
                </span>
                <span className="text-[9px] bg-white/10 border border-white/20 text-white/70 px-2.5 py-0.5 rounded-full font-bold tracking-widest mt-1.5">{liveData?.overs || '0.0'} OV</span>
              </div>
            </div>
            {/* Bottom: Details + Target */}
            <div className="flex items-center gap-2 mt-3 z-10 relative">
              <span className="text-theme-primary text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-0.5 opacity-80 bg-theme-primary/10 px-2.5 py-1.5 rounded-full group-hover:bg-theme-primary/20 transition-colors">
                Details <span className="text-sm leading-none pb-0.5">›</span>
              </span>
              {liveData?.targetScore && (
                <span className="text-blue-400 text-[9px] font-black tracking-widest uppercase bg-blue-500/10 px-2.5 py-1.5 rounded-full border border-blue-500/20">Target: {liveData.targetScore}</span>
              )}
            </div>
            <div className="absolute -right-4 -bottom-8 opacity-[0.03] pointer-events-none text-9xl">🏏</div>
          </div>
        );
      })()}

      {/* 3. New Featured Carousel Section */}
      <div className="mt-2 text-center">
        <FeaturedCarousel items={carouselItems} />
      </div>

      {/* 4. Participating Teams Grid Section */}
      <div className="px-2">
        <h3 className="text-white font-bold mb-4 px-1 text-[14px] tracking-tight">Participating Teams</h3>
        <div className="grid grid-cols-2 gap-4">
          {allTeams.length === 0 ? (
            <div className="col-span-2 text-center p-6 text-xs text-theme-text/40">Loading participating teams...</div>
          ) : (
            allTeams.map(team => <TeamCard key={team.id} team={team} />)
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
