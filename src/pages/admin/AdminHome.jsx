// src/pages/admin/AdminHome.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, collection, onSnapshot, setDoc, getDoc, getDocs } from 'firebase/firestore';
import LiveScore from './LiveScore';
import TeamCard from '../../components/user/TeamCard';
import FeaturedCarousel from '../../components/user/FeaturedCarousel';

function AdminHome() {
  const [liveData, setLiveData] = useState(null);
  const [teams, setTeams] = useState({ teamA: null, teamB: null });
  const [allTeams, setAllTeams] = useState([]);
  const [viewLiveScore, setViewLiveScore] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [selectedTeamA, setSelectedTeamA] = useState('');
  const [selectedTeamB, setSelectedTeamB] = useState('');
  const [battingTeam, setBattingTeam] = useState('');

  useEffect(() => {
    const liveMatchRef = doc(db, 'liveMatch', 'current');
    const unsubscribe = onSnapshot(liveMatchRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLiveData(data);
        // Sync local view state: if match is no longer live, exit live score view
        if (data.status !== 'live') {
          setViewLiveScore(false);
        }
      }
    });
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

  const handleStartMatch = async () => {
    if (!selectedTeamA || !selectedTeamB || !battingTeam) return;

    const liveMatchRef = doc(db, 'liveMatch', 'current');
    await setDoc(liveMatchRef, {
      status: 'live',
      matchNumber: Math.floor(Math.random() * 100),
      teamAId: selectedTeamA, 
      teamBId: selectedTeamB,
      battingTeam: battingTeam,
      innings: 1,
      targetScore: null,
      firstInningsScore: null,
      scores: 0,
      wickets: 0,
      balls: 0,
      overs: '0.0',
      lastAction: null
    });
    
    setIsCreatingMatch(false);
    setViewLiveScore(true);
  };

  if (viewLiveScore && liveData?.status === 'live') {
    return <LiveScore onBack={() => setViewLiveScore(false)} />;
  }

  const isMatchLive = liveData && liveData.status === 'live';

  const carouselItems = [
    { id: 1, title: "Season 3 Begins", desc: "The ultimate showdown of Jammikunta city cricket.", bg: "bg-blue-500/20 border-blue-500/30", img: "/images/carousel_stadium.png" },
    { id: 2, title: "League Format", desc: "9 elite teams, complete round-robin.", bg: "bg-purple-500/20 border-purple-500/30", img: "/images/carousel_ball.png" },
    { id: 3, title: "Live Dashboards", desc: "Track leading scorers directly live.", bg: "bg-blue-500/20 border-blue-500/30", img: "/images/carousel_dashboard.png" }
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 w-full">
      {/* Removed Header */}

      <div className="bg-theme-card p-6 rounded-[32px] border border-blue-500/30 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden mx-1">
        <div className={`absolute top-0 left-0 w-full h-1 ${isMatchLive ? 'bg-blue-500 animate-pulse' : 'bg-white/5'}`}></div>
        <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/10 shadow-inner">
          <span className="text-blue-500 text-2xl drop-shadow-md">🏏</span>
        </div>
        {isMatchLive ? (
          <>
            <h3 className="text-lg font-bold text-white mb-1 tracking-tight">Live Match In Progress</h3>
            <p className="text-[11px] font-medium tracking-wide text-theme-text/60 mb-6 uppercase">Control Center Active</p>
            <button onClick={() => setViewLiveScore(true)} className="bg-blue-500 text-black font-bold px-8 py-4 rounded-full w-full active:scale-95 transition-all shadow-[0_4px_24px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_32px_rgba(16,185,129,0.4)] tracking-wide">
              Open Control Panel
            </button>
          </>
        ) : (
          !isCreatingMatch ? (
            <>
              <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Deploy a Match on Server</h3>
              <button 
                onClick={() => setIsCreatingMatch(true)} 
                className="bg-blue-500 text-black font-bold px-8 py-4 rounded-full w-full active:scale-95 transition-all shadow-[0_4px_24px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_32px_rgba(16,185,129,0.4)] tracking-wide">
                Initialize Match
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col gap-3 text-left animate-fade-in relative z-20">
              <h3 className="text-white font-black text-center text-sm mb-2 uppercase tracking-widest border-b border-white/5 pb-3">League Registry</h3>
              
              <div className="w-full">
                <label className="text-[9px] uppercase font-black text-theme-text/40 tracking-[0.2em] pl-3 mb-1 block">Team A (Host)</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-[16px] px-4 py-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                  value={selectedTeamA} onChange={e => setSelectedTeamA(e.target.value)}>
                  <option value="" disabled className="bg-theme-background">Select Host Team</option>
                  {allTeams.map(t => <option key={t.id} value={t.id} className="bg-theme-background font-bold text-sm tracking-wide">{t.name}</option>)}
                </select>
              </div>

              <div className="w-full">
                <label className="text-[9px] uppercase font-black text-theme-text/40 tracking-[0.2em] pl-3 mb-1 block">Team B (Away)</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-[16px] px-4 py-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                  value={selectedTeamB} onChange={e => setSelectedTeamB(e.target.value)}>
                  <option value="" disabled className="bg-theme-background">Select Away Team</option>
                  {allTeams.filter(t => t.id !== selectedTeamA).map(t => <option key={t.id} value={t.id} className="bg-theme-background font-bold text-sm tracking-wide">{t.name}</option>)}
                </select>
              </div>

              {selectedTeamA && selectedTeamB && (
                <div className="w-full animate-fade-in mt-1">
                  <label className="text-[9px] uppercase font-black text-blue-400/80 tracking-[0.2em] pl-3 mb-1 block">Toss Winner / Batting</label>
                  <select className="w-full bg-blue-500/10 border border-blue-500/30 rounded-[16px] px-4 py-3 text-sm font-bold text-blue-400 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer shadow-inner"
                    value={battingTeam} onChange={e => setBattingTeam(e.target.value)}>
                    <option value="" disabled className="bg-theme-background">Select Batting Team</option>
                    <option value={selectedTeamA} className="bg-theme-background">{allTeams.find(t => t.id === selectedTeamA)?.name} Bats First</option>
                    <option value={selectedTeamB} className="bg-theme-background">{allTeams.find(t => t.id === selectedTeamB)?.name} Bats First</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={() => { setIsCreatingMatch(false); setSelectedTeamA(''); setSelectedTeamB(''); setBattingTeam(''); }} className="flex-[0.8] px-4 py-3.5 border border-white/10 rounded-[16px] bg-white/5 text-white text-[11px] uppercase tracking-wider font-bold active:scale-95 transition-transform">Cancel</button>
                <button onClick={handleStartMatch} disabled={!selectedTeamA || !selectedTeamB || !battingTeam} className="flex-[1.2] px-4 py-3.5 rounded-[16px] bg-blue-500 text-black text-[11px] tracking-wider uppercase font-black active:scale-95 disabled:opacity-30 disabled:grayscale transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.4)]">
                  Start Live Match
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* 2. Compact Live Match View */}
      {!isMatchLive ? (
         <div className="bg-theme-card p-6 mx-2 rounded-[28px] border border-white/5 shadow-lg flex items-center gap-5 transition-transform hover:scale-[1.02] duration-300 relative overflow-hidden">
           <div className="w-12 h-12 bg-white/5 rounded-full flex shrink-0 items-center justify-center border border-white/5 shadow-inner">
             <span className="text-xl opacity-40 drop-shadow-sm blur-[0.5px]">🛡️</span>
           </div>
           <div>
             <h3 className="text-white font-bold text-sm tracking-tight relative z-10">Compact View</h3>
           </div>
         </div>
      ) : (
        <div 
          onClick={() => setViewLiveScore(true)}
          className="bg-theme-card p-5 mx-2 rounded-[28px] border border-theme-primary/30 shadow-[0_8px_20px_rgba(10,132,255,0.1)] relative overflow-hidden active:scale-95 transition-transform cursor-pointer group"
        >
          {/* Top: Teams + Score */}
          <div className="flex items-start justify-between z-10 relative">
            <div className="flex flex-col">
              <span className="text-red-500 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 drop-shadow-sm mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
              </span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-xl flex items-center gap-1">{teams.teamA?.name?.toUpperCase() || 'LOCAL'}{liveData?.battingTeam === liveData?.teamAId && <span className="text-base">🏏</span>}</span>
                <span className="text-theme-text/30 text-[11px] font-black italic">vs</span>
                <span className="text-white font-bold text-xl flex items-center gap-1">{teams.teamB?.name?.toUpperCase() || 'AWAY'}{liveData?.battingTeam === liveData?.teamBId && <span className="text-base">🏏</span>}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black text-white tracking-tighter leading-none flex items-baseline">
                {liveData?.scores || 0}<span className="text-theme-text/30 font-light mx-[1px]">/</span><span className="text-2xl">{liveData?.wickets || 0}</span>
              </span>
              <span className="text-[9px] bg-white/10 border border-white/20 text-white/70 px-2.5 py-0.5 rounded-full font-bold tracking-widest mt-1.5">{liveData?.overs || '0.0'} OV</span>
            </div>
          </div>
          {/* Bottom: Control */}
          <div className="flex items-center gap-2 mt-3 z-10 relative">
            <span className="text-theme-primary text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-0.5 opacity-80 bg-theme-primary/10 px-2.5 py-1.5 rounded-full group-hover:bg-theme-primary/20 transition-colors">
              Control <span className="text-sm leading-none pb-0.5">›</span>
            </span>
          </div>
          <div className="absolute -right-4 -bottom-8 opacity-[0.03] pointer-events-none text-9xl">🏏</div>
        </div>
      )}

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

export default AdminHome;
