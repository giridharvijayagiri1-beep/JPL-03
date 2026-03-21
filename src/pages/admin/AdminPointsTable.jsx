// src/pages/admin/AdminPointsTable.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
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

function AdminPointsTable() {
  const [tableData, setTableData] = useState([]);
  const [teamDict, setTeamDict] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

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

  const handleResetTable = async () => {
    setShowResetModal(false);
    setResetConfirmText('');
    setLoading(true);
    try {
      const batch = writeBatch(db);
      Object.keys(teamDict).forEach(teamId => {
        const ref = doc(db, 'pointsTable', teamId);
        batch.set(ref, {
          teamId: teamId,
          matches: 0,
          wins: 0,
          losses: 0,
          points: 0,
          runsScored: 0,
          ballsFaced: 0,
          runsConceded: 0,
          ballsBowled: 0
        }, { merge: true });
      });
      
      await batch.commit();
    } catch (err) {
      console.error("Error resetting points table:", err);
      setError("Failed to reset table.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col animate-fade-in w-full pb-10">
      
      <div className="mb-6 sticky top-[-20px] bg-theme-background/90 backdrop-blur-lg pt-2 pb-4 z-20 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Manage Points Table</h2>
          <p className="text-xs text-theme-text/60 font-medium">Top 4 ranked teams qualify for semifinals.</p>
        </div>
        <button 
          onClick={() => setShowResetModal(true)}
          className="bg-white/5 text-white border border-white/10 active:scale-95 w-10 h-10 flex items-center justify-center rounded-full font-bold text-xl transition-all shadow-sm hover:bg-white/10 shrink-0 ml-4"
          title="Reset Points Table"
        >
          ↻
        </button>
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

      {/* Danger Zone Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-background border border-red-500/30 rounded-[28px] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 text-2xl">⚠️</div>
            <h3 className="text-white font-bold text-xl mb-2">Are you absolutely sure?</h3>
            <p className="text-theme-text/70 text-sm mb-4 leading-relaxed">
              This action doesn't just reset stats—it permanently zeroes out the entire points table. This <b>cannot</b> be undone.
            </p>
            <div className="w-full bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4 text-left">
              <label className="text-[10px] text-theme-text/50 font-black uppercase tracking-widest block mb-2">Please type <b>RESET</b> to confirm.</label>
              <input 
                type="text" 
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white font-bold tracking-widest focus:outline-none focus:border-red-500/50"
                placeholder="RESET"
              />
            </div>
            
            <button 
              onClick={handleResetTable}
              disabled={resetConfirmText !== 'RESET'}
              className="w-full bg-red-500 text-white font-black tracking-widest uppercase py-3.5 rounded-xl disabled:opacity-30 disabled:grayscale transition-all shadow-[0_4px_15px_rgba(239,68,68,0.4)] disabled:shadow-none hover:bg-red-600 mb-2"
            >
              I understand, reset it
            </button>
            <button 
              onClick={() => {
                setShowResetModal(false);
                setResetConfirmText('');
              }}
              className="w-full bg-transparent text-theme-text/60 font-bold tracking-wide py-2 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default AdminPointsTable;
