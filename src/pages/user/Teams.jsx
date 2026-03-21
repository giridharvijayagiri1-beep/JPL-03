// src/pages/user/Teams.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);

  // Fetch teams using realtime syncing exactly like Admin
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'teams'), (snap) => {
      const teamsArray = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      teamsArray.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setTeams(teamsArray);
      setLoading(false);
    }, (err) => {
      console.error("Teams fetch error:", err);
      setError("Network offline. Unable to sync team registry.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col animate-fade-in w-full pb-10">
      
      <div className="mb-6 sticky top-[-20px] bg-theme-background/90 backdrop-blur-lg pt-2 pb-4 z-20">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Teams</h2>
        <p className="text-xs text-theme-text/60 font-medium tracking-wide">JPL-03 Participating Franchises</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <span className="w-8 h-8 rounded-full border-2 border-theme-primary/30 border-t-theme-primary animate-spin mb-4"></span>
          <span className="text-sm font-medium text-theme-text/50">Fetching directory...</span>
        </div>
      ) : error ? (
        <div className="bg-theme-card p-8 rounded-[32px] border border-red-500/10 text-center flex flex-col items-center shadow-lg mx-2">
          <span className="text-4xl opacity-80 mb-4 inline-block">⚠️</span>
          <h3 className="text-white font-bold text-sm mb-1 uppercase tracking-widest text-red-400">Connection Error</h3>
          <p className="text-xs text-theme-text/50">{error}</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-theme-card p-10 rounded-[32px] border border-white/5 text-center flex flex-col items-center shadow-lg mx-4">
          <span className="text-5xl opacity-30 mb-4 inline-block">🛡️</span>
          <h3 className="text-white font-bold text-lg mb-1">No Teams Enrolled</h3>
          <p className="text-xs text-theme-text/50">Waiting for franchises to register globally.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-[100px]">
          {teams.map((t, index) => {
            const isExpanded = expandedTeam === t.id;
            return (
              <div 
                key={t.id} 
                style={{ animationDelay: `${index * 0.04}s` }} 
                className="animate-fade-in bg-theme-card border border-white/5 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 relative"
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => setExpandedTeam(isExpanded ? null : t.id)}
                  className={`flex items-center justify-between p-4 ${isExpanded ? 'bg-white/5 border-b border-white/5' : ''} cursor-pointer hover:bg-white/[0.02]`}
                >
                  <div className="flex items-center justify-between w-full">
                     <div className="flex items-center gap-4">
                       <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden shadow-inner">
                          {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover"/> : '🛡️'}
                       </div>
                       <span className="text-[17px] font-bold text-white italic tracking-wide">{t.name || "Unnamed"}</span>
                     </div>
                     <button 
                        className="group w-8 h-8 flex items-center justify-center shrink-0 text-white/40 hover:text-white transition-all duration-300 ease-in-out mr-2 pointer-events-none"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className={`transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                        >
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                  </div>
                </div>

                {/* Accordion Content Container */}
                <div 
                  className={`transition-all duration-500 ease-in-out origin-top ${isExpanded ? 'opacity-100 max-h-[1000px]' : 'max-h-0 opacity-0'} overflow-hidden`}
                >
                  <div className="p-4 bg-black/20 text-sm flex flex-col gap-5">
                    {['Batsman', 'Bowler', 'All-rounder'].map(role => {
                      const rolePlayers = (t.players || []).filter(p => p.role === role);
                      return (
                        <div key={role} className="relative">
                          {/* Role Header */}
                          <div className="flex items-center gap-2 mb-3 text-theme-text/50 font-black uppercase tracking-[0.2em] text-[10px]">
                            {role}s
                          </div>
                          
                          {/* Player List */}
                          <div className="flex flex-col gap-2">
                            {rolePlayers.length === 0 && <div className="text-white/20 pl-4 italic text-xs">No {role.toLowerCase()}s recorded</div>}
                            
                            {rolePlayers.map(p => (
                              <div key={p.id} className="flex items-center gap-3 px-2">
                                <span className="text-[16px] opacity-80 w-5 text-center">{role === 'Batsman' ? '🏏' : role === 'Bowler' ? '🔴' : '👤'}</span>
                                <span className="text-white/90 font-medium">{p.name || 'Unnamed Player'}</span>
                              </div>
                            ))}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
      
    </div>
  );
}

export default Teams;
