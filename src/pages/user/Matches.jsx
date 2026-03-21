// src/pages/user/Matches.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import MatchCard from '../../components/user/MatchCard';

function Matches() {
  const [matches, setMatches] = useState([]);
  const [teamDict, setTeamDict] = useState({});
  const [filter, setFilter] = useState('all'); // Filtering active flag
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial Fetch of entire Teams Collection uniquely mapping them locally
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const dict = {};
        teamsSnap.forEach(doc => { dict[doc.id] = doc.data(); });
        setTeamDict(dict);
      } catch (error) {
        console.error("Teams cache error:", error);
      }
    };
    fetchTeams();
  }, []);

  // Monitor Match Lifecycle specifically locally ordered by schedule ID or Number
  useEffect(() => {
    const matchQuery = query(collection(db, 'matches'), orderBy('matchNumber', 'asc'));
    const unsubscribe = onSnapshot(matchQuery, (snapshot) => {
      const liveDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(liveDocs);
      setLoading(false);
    }, (error) => {
      console.error("Matches Sync Error:", error);
      setError("Match tracking offline. Data may be outdated.");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Soft-Filter Array on render
  const filteredMatches = matches.filter(match => {
    if (filter === 'all') return true;
    return match.status === filter;
  });

  return (
    <div className="flex flex-col animate-fade-in w-full">
      
      {/* Dynamic Header & Built-in Tabs segment */}
      <div className="mb-6 sticky top-[-20px] bg-theme-background/90 backdrop-blur-lg pt-2 pb-4 z-20">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-4">Matches</h2>
        
        {/* Apple-style Filter Pill bar */}
        <div className="flex p-1.5 bg-theme-card border border-white/10 rounded-full w-full shadow-inner">
          {['all', 'upcoming', 'live', 'completed'].map(f => (
             <button
                key={f}
                onClick={() => setFilter(f)}
               className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300 ${
                 filter === f 
                 ? 'bg-white/10 text-white shadow-sm' 
                 : 'text-theme-text/40 hover:text-white/80'
               }`}
             >
               {f}
             </button>
          ))}
        </div>
      </div>

      {/* Match Cards View Flow */}
      <div className="flex flex-col">
        {error && (
          <div className="bg-theme-card p-4 rounded-xl border border-red-500/20 text-center mb-4 text-xs font-medium text-red-400">
            ⚠️ {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <span className="w-8 h-8 rounded-full border-2 border-theme-primary/30 border-t-theme-primary animate-spin mb-4"></span>
            <span className="text-sm font-medium text-theme-text/50">Syncing matches...</span>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-theme-card p-10 rounded-[32px] border border-white/5 text-center mt-2 flex flex-col items-center shadow-lg">
            <span className="text-5xl opacity-30 mb-4 inline-block">📭</span>
            <h3 className="text-white font-bold text-lg mb-1">No Matches Found</h3>
            <p className="text-xs text-theme-text/50">Adjust filters to see other schedules.</p>
          </div>
        ) : (
          filteredMatches.map((match, idx) => (
             <div 
               key={match.id} 
               style={{ animationDelay: `${idx * 0.05}s` }}
               className="animate-fade-in"
             >
               <MatchCard 
                 match={match} 
                 teamAMeta={teamDict[match.teamAId]} 
                 teamBMeta={teamDict[match.teamBId]} 
               />
             </div>
          ))
        )}
      </div>
      
    </div>
  );
}

export default Matches;
