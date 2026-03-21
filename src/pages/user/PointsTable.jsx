// src/pages/user/PointsTable.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import PointsRow from '../../components/user/PointsRow';

const calcNRR = (team) => {
  const rs = team.runsScored || 0;
  const bf = team.ballsFaced || 0;
  const rc = team.runsConceded || 0;
  const bb = team.ballsBowled || 0;
  
  const of = bf / 6;
  const ob = bb / 6;
  
  if (of === 0 && ob === 0) return 0;
  const p1 = of > 0 ? rs / of : 0;
  const p2 = ob > 0 ? rc / ob : 0;
  return p1 - p2;
};

function PointsTable() {
  const [tableData, setTableData] = useState([]);
  const [teamDict, setTeamDict] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch Teams Reference Dict exactly once
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

  // 2. Continuous realtime ranking sync directly off pointsTable DB schema
  useEffect(() => {
    const ptsRef = collection(db, 'pointsTable');
    const unsubscribe = onSnapshot(ptsRef, (snapshot) => {
      let data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return { 
          id: doc.id, 
          ...docData, 
          nrr: calcNRR(docData) 
        };
      });
      
      // Auto-Sorting engine logic manually executed client side enforcing constraints perfectly
      data.sort((a, b) => {
        const ptsA = a.points || 0;
        const ptsB = b.points || 0;
        // Evaluate primary hierarchy constraint: descending total points
        if (ptsA !== ptsB) return ptsB - ptsA;
        
        // Tie breaker constraint: descending total wins count
        const winsA = a.wins || 0;
        const winsB = b.wins || 0;
        if (winsB !== winsA) return winsB - winsA;
        
        // Tertiary tie breaker constraint: Net Run Rate
        return (b.nrr || 0) - (a.nrr || 0);
      });
      
      setTableData(data);
      setLoading(false);
    }, (err) => {
      console.error("Standings disconnected:", err);
      setError("Live standings disconnected.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col animate-fade-in w-full pb-10">
      
      <div className="mb-6 sticky top-[-20px] bg-theme-background/90 backdrop-blur-lg pt-2 pb-4 z-20">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Points Table</h2>
        <p className="text-xs text-theme-text/60 font-medium">Top 4 ranked teams qualify for semifinals.</p>
      </div>

      {error && (
        <div className="bg-theme-card p-4 rounded-xl border border-red-500/20 text-center mb-4 text-xs font-medium text-red-400">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <span className="w-8 h-8 rounded-full border-2 border-theme-primary/30 border-t-theme-primary animate-spin mb-4"></span>
          <span className="text-sm font-medium text-theme-text/50">Computing standings...</span>
        </div>
      ) : tableData.length === 0 ? (
        <div className="bg-theme-card p-10 rounded-[32px] border border-white/5 text-center flex flex-col items-center shadow-lg">
          <span className="text-5xl opacity-30 mb-4 inline-block">🏆</span>
          <h3 className="text-white font-bold text-lg mb-1">No Data Available</h3>
          <p className="text-xs text-theme-text/50">Matches need to be completed first.</p>
        </div>
      ) : (
        <div className="bg-theme-card p-4 rounded-[32px] border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          
          {/* Strict clean table header columns matched to flex width scaling */}
          <div className="flex items-center justify-between px-3 pb-3 mb-2 border-b border-white/5">
            <div className="flex items-center gap-6 flex-[2]">
              <div className="w-6 text-center text-[10px] font-black text-theme-text/40 tracking-widest uppercase">POS</div>
              <span className="text-[10px] font-black text-theme-text/40 tracking-widest uppercase">Team</span>
            </div>
            
            <div className="flex items-center justify-between flex-[1.7] text-[10px] font-black tracking-widest text-theme-text/40 uppercase">
              <div className="w-8 text-center" title="Matches Played">M</div>
              <div className="w-8 text-center" title="Wins">W</div>
              <div className="w-8 text-center" title="Losses">L</div>
              <div className="w-8 text-center text-white" title="Points">Pts</div>
              <div className="w-10 text-center" title="Net Run Rate">NRR</div>
            </div>
          </div>
          
          {/* Mapping out dynamic rows */}
          <div className="flex flex-col">
            {tableData.map((ptData, index) => (
              <div 
                key={ptData.id}
                style={{ animationDelay: `${index * 0.05}s` }} 
                className="animate-fade-in"
              >
                <PointsRow 
                  rank={index + 1} 
                  ptData={ptData} 
                  teamMeta={teamDict[ptData.teamId || ptData.id]} 
                />
              </div>
            ))}
          </div>

        </div>
      )}
      
    </div>
  );
}

export default PointsTable;
