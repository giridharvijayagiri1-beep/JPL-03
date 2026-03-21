import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, doc, updateDoc, deleteDoc, addDoc, writeBatch, setDoc } from 'firebase/firestore';
import MatchCard from '../../components/user/MatchCard';

function AdminMatches({ onNavigate }) {
  const [matches, setMatches] = useState([]);
  const [localMatches, setLocalMatches] = useState({});
  const [teamDict, setTeamDict] = useState({});
  const [filter, setFilter] = useState('all'); // Filtering active flag
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // 1. State for Long Press Match Start
  const [matchToStart, setMatchToStart] = useState(null);
  const [battingTeam, setBattingTeam] = useState('');
  const timerRef = useRef(null);

  // Initial Fetch of entire Teams Collection uniquely mapping them locally
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const dict = {};
        teamsSnap.forEach(doc => { dict[doc.id] = { id: doc.id, ...doc.data() }; });
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
      setError(null);
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

  const handleToggleEdit = () => {
    if (editMode) {
      handleSave();
    } else {
      const draft = {};
      matches.forEach(m => draft[m.id] = m);
      setLocalMatches(draft);
      setEditMode(true);
      setFilter('all'); // Force all view explicitly
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const m of Object.values(localMatches)) {
        const original = matches.find(orig => orig.id === m.id);
        if (!original || JSON.stringify(original) !== JSON.stringify(m)) {
          if (m.id.startsWith('temp_')) {
            const { id, ...dataToSave } = m;
            await addDoc(collection(db, 'matches'), dataToSave);
          } else {
            await updateDoc(doc(db, 'matches', m.id), {
               teamAId: m.teamAId,
               teamBId: m.teamBId,
               status: m.status,
               matchNumber: m.matchNumber
            });
          }
        }
      }
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setError("Failed to sync matches securely.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    const id = matchToDelete.id;
    try {
      if (!id.startsWith('temp_')) {
        await deleteDoc(doc(db, 'matches', id));
      }
      setLocalMatches(prev => {
        const nw = { ...prev };
        delete nw[id];
        return nw;
      });
    } catch (err) {}
    setMatchToDelete(null);
    setDeleteConfirmText('');
  };

  const handleAddMatch = () => {
    const newId = `temp_${Date.now()}`;
    const teamsList = Object.keys(teamDict);
    const defaultTeamA = teamsList.length > 0 ? teamsList[0] : '';
    const defaultTeamB = teamsList.length > 1 ? teamsList[1] : '';
    
    setLocalMatches(prev => ({
      ...prev,
      [newId]: {
        id: newId,
        matchNumber: Object.keys(prev).length + 1,
        status: 'upcoming',
        teamAId: defaultTeamA,
        teamBId: defaultTeamB,
        date: new Date().toISOString()
      }
    }));
  };

  const handleResetMatches = async () => {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'matches'));
      snapshot.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      setShowResetModal(false);
      setResetConfirmText('');
      setEditMode(false);
      setLocalMatches({});
      setError(null);
    } catch (err) {
      console.error("Failed to reset matches:", err);
      setError("Failed to reset matches globally.");
    }
  };

  // --- LONG PRESS TO START LIVE MATCH LOGIC ---
  const handlePointerDown = (match) => {
    // Only allow starting 'upcoming' matches strictly in VIEW mode, and only if no match is already live
    const anyMatchLive = matches.some(m => m.status === 'live');
    if (editMode || match.status !== 'upcoming' || anyMatchLive) return;
    
    // Clear any existing timer implicitly
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // 600ms threshold for long press
    timerRef.current = setTimeout(() => {
      setMatchToStart(match);
      setBattingTeam(''); // reset toss selection
    }, 600); 
  };

  const handlePointerUpOrLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Broadcast Initialization Transaction
  const handleStartLiveMatch = async () => {
    if (!matchToStart || !battingTeam) return;
    setIsSaving(true);
    try {
      // 1. Update the formally scheduled match to explicitly show "Live" in the Admin Schedules
      await updateDoc(doc(db, 'matches', matchToStart.id), {
        status: 'live'
      });

      // 2. Initialize the global broadcasting state payload, CRITICALLY passing matchId to link resolution mappings!
      const liveMatchRef = doc(db, 'liveMatch', 'current');
      await setDoc(liveMatchRef, {
        status: 'live',
        matchId: matchToStart.id, // Engine hooks onto this to overwrite results later
        matchNumber: matchToStart.matchNumber || 0,
        teamAId: matchToStart.teamAId,
        teamBId: matchToStart.teamBId,
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

      setMatchToStart(null);
      setBattingTeam('');
      // Navigate to home tab where AdminHome will auto-detect the live match
      if (onNavigate) onNavigate('home');
    } catch (err) {
      console.error("Failed to sequence Match Initialization:", err);
      alert("Database framework error: Could not route match protocol.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const displayMatches = editMode ? Object.values(localMatches) : filteredMatches;

  return (
    <div className="flex flex-col animate-fade-in w-full pb-10">
      
      {/* Dynamic Header & Built-in Tabs segment */}
      <div className="mb-6 sticky top-[-20px] bg-theme-background/90 backdrop-blur-lg pt-2 pb-4 z-20">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Manage Matches</h2>
          <button 
            onClick={() => setShowResetModal(true)}
            className="w-8 h-8 flex items-center justify-center shrink-0 bg-white/10 text-white rounded-full border border-white/20 active:scale-95 transition-all hover:bg-white/20 hover:rotate-180"
            title="Reset All Matches"
          >
            ↻
          </button>
        </div>
        <p className="text-xs text-theme-text/60 font-medium mb-4 tracking-wide">Create, update, or remove matches.</p>
        
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
        
        {/* Global Add Match Button (Moved to Top) */}
        {editMode && (
           <button onClick={handleAddMatch} className="w-full mb-6 bg-theme-primary/10 border border-theme-primary/30 border-dashed rounded-[24px] py-6 text-theme-primary font-black uppercase tracking-[0.2em] active:scale-95 transition-all shadow-inner hover:bg-theme-primary/20 flex flex-col items-center justify-center gap-2">
             <span className="text-3xl leading-none">+</span>
             New Match
           </button>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <span className="w-8 h-8 rounded-full border-2 border-theme-primary/30 border-t-theme-primary animate-spin mb-4"></span>
            <span className="text-sm font-medium text-theme-text/50">Syncing matches...</span>
          </div>
        ) : displayMatches.length === 0 ? (
          <div className="bg-theme-card p-10 rounded-[32px] border border-white/5 text-center mt-2 flex flex-col items-center shadow-lg">
            <span className="text-5xl opacity-30 mb-4 inline-block">📭</span>
            <h3 className="text-white font-bold text-lg mb-1">No Matches Found</h3>
            <p className="text-xs text-theme-text/50">Adjust filters to see other schedules.</p>
          </div>
        ) : (
          displayMatches.map((match, idx) => (
             <div 
               key={match.id} 
               style={{ animationDelay: `${idx * 0.05}s` }}
               className="animate-fade-in"
             >
               {editMode ? (
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-5 relative shadow-inner mb-4">
                   {/* Header: Match Num and Status */}
                   <div className="flex justify-between items-center pr-10">
                     <div className="flex items-center gap-3">
                       <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Match</span>
                       <input 
                         type="number" 
                         value={match.matchNumber || ''} 
                         onChange={e => setLocalMatches(prev => ({ ...prev, [match.id]: { ...prev[match.id], matchNumber: Number(e.target.value) } }))}
                         className="bg-black/40 border border-white/10 w-16 text-center text-white font-bold rounded-lg px-2 py-1.5 text-sm outline-none focus:border-theme-primary/50 transition-colors" 
                       />
                     </div>
                     
                     <select 
                       value={match.status} 
                       onChange={e => setLocalMatches(prev => ({ ...prev, [match.id]: { ...prev[match.id], status: e.target.value } }))}
                       className="bg-black/40 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider outline-none focus:border-theme-primary/50 appearance-none text-center cursor-pointer"
                     >
                       <option value="upcoming">Upcoming</option>
                       {match.status === 'live' && <option value="live" className="bg-theme-background">Live</option>}
                       {match.status === 'completed' && <option value="completed" className="bg-theme-background">Completed</option>}
                     </select>
                   </div>
                   
                   {/* Teams container */}
                   <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-[10px] font-black text-theme-primary uppercase">A</div>
                       <select 
                         value={match.teamAId || ''} 
                         onChange={e => {
                           const newTeamAId = e.target.value;
                           setLocalMatches(prev => ({
                             ...prev,
                             [match.id]: { 
                               ...prev[match.id], 
                               teamAId: newTeamAId,
                               // Auto-clear Team B if it matches the newly selected Team A
                               teamBId: prev[match.id].teamBId === newTeamAId ? '' : prev[match.id].teamBId 
                             }
                           }));
                         }}
                         className="flex-1 bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:border-theme-primary/50 appearance-none cursor-pointer"
                       >
                         <option value="" disabled className="bg-theme-background">Select Team A</option>
                         {Object.values(teamDict).map(t => (
                           <option key={t.id} value={t.id} className="bg-theme-background font-bold text-sm tracking-wide">{t.name}</option>
                         ))}
                       </select>
                     </div>
                     <div className="flex items-center gap-3 w-full my-1">
                        <div className="h-[1px] bg-white/5 flex-1 mx-4"></div>
                        <span className="text-[9px] text-theme-text/30 font-black uppercase tracking-widest">VS</span>
                        <div className="h-[1px] bg-white/5 flex-1 mx-4"></div>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-[10px] font-black text-theme-primary uppercase">B</div>
                       <select 
                         value={match.teamBId || ''} 
                         onChange={e => setLocalMatches(prev => ({ ...prev, [match.id]: { ...prev[match.id], teamBId: e.target.value } }))}
                         className="flex-1 bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none focus:border-theme-primary/50 appearance-none cursor-pointer"
                       >
                         <option value="" disabled className="bg-theme-background">Select Team B</option>
                         {Object.values(teamDict)
                            .filter(t => t.id !== match.teamAId)
                            .map(t => <option key={t.id} value={t.id} className="bg-theme-background font-bold text-sm tracking-wide">{t.name}</option>)}
                       </select>
                     </div>
                   </div>
                   
                   {/* Delete Match Button */}
                   <button onClick={() => setMatchToDelete(match)} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-transparent text-white rounded-lg border border-white/20 active:scale-95 transition-all hover:bg-white/10">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                       <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                     </svg>
                   </button>
                 </div>
               ) : (
                 <div
                   onPointerDown={() => handlePointerDown(match)}
                   onPointerUp={handlePointerUpOrLeave}
                   onPointerLeave={handlePointerUpOrLeave}
                   onContextMenu={(e) => {
                     // Prevent right click / long press menu if not in edit mode
                     if (!editMode && match.status === 'upcoming') e.preventDefault();
                   }}
                   className={!editMode && match.status === 'upcoming' ? 'cursor-pointer relative' : 'relative'}
                   style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                 >
                   <MatchCard 
                     match={match} 
                     teamAMeta={teamDict[match.teamAId]} 
                     teamBMeta={teamDict[match.teamBId]} 
                   />
                 </div>
               )}
             </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={handleToggleEdit}
        disabled={isSaving}
        className={`fixed bottom-[90px] right-6 w-[56px] h-[56px] rounded-full shadow-lg border flex items-center justify-center text-2xl transition-all z-50 focus:outline-none disabled:opacity-50
          ${editMode 
            ? 'bg-white text-theme-background border-white shadow-[0_4px_15px_rgba(255,255,255,0.4)]' 
            : 'bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20'}`}
      >
        {isSaving ? (
           <span className="w-6 h-6 rounded-full border-2 border-theme-background/30 border-t-theme-background animate-spin"></span>
        ) : editMode ? '✓' : '✎'}
      </button>

      {/* Danger Zone Delete Match Modal */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-background border border-white/10 rounded-[28px] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white mb-4 text-2xl">⚠️</div>
            <h3 className="text-white font-bold text-xl mb-2">Delete Match?</h3>
            <p className="text-theme-text/70 text-sm mb-4 leading-relaxed">
              This will permanently delete <b>Match {matchToDelete.matchNumber || '-'}</b> from the tournament schedule. This cannot be undone.
            </p>
            <div className="w-full bg-black/20 border border-white/5 rounded-xl p-4 mb-4 text-left">
              <label className="text-[10px] text-theme-text/50 font-black uppercase tracking-widest block mb-2">Please type <b>DELETE</b> to confirm.</label>
              <input 
                type="text" 
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white font-bold tracking-widest focus:outline-none focus:border-white/50"
                placeholder="DELETE"
              />
            </div>
            
            <button 
              onClick={confirmDeleteMatch}
              disabled={deleteConfirmText !== 'DELETE'}
              className="w-full bg-white/10 text-white font-black tracking-widest uppercase py-3.5 rounded-xl border border-white/20 disabled:opacity-30 disabled:border-transparent transition-all hover:bg-white/20 mb-2"
            >
              Delete Match
            </button>
            <button 
              onClick={() => {
                setMatchToDelete(null);
                setDeleteConfirmText('');
              }}
              className="w-full bg-transparent text-theme-text/60 font-bold tracking-wide py-2 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone Reset All Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-background border border-white/10 rounded-[28px] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white mb-4 text-2xl">⚠️</div>
            <h3 className="text-white font-bold text-xl mb-2">Reset Entire Schedule?</h3>
            <p className="text-theme-text/70 text-sm mb-4 leading-relaxed">
              This will permanently delete <b>every single match</b> from the database. This action cannot be undone.
            </p>
            <div className="w-full bg-black/20 border border-white/5 rounded-xl p-4 mb-4 text-left">
              <label className="text-[10px] text-theme-text/50 font-black uppercase tracking-widest block mb-2">Please type <b>RESET</b> to confirm.</label>
              <input 
                type="text" 
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white font-bold tracking-widest focus:outline-none focus:border-white/50"
                placeholder="RESET"
              />
            </div>
            
            <button 
              onClick={handleResetMatches}
              disabled={resetConfirmText !== 'RESET'}
              className="w-full bg-white/10 text-white font-black tracking-widest uppercase py-3.5 rounded-xl border border-white/20 disabled:opacity-30 disabled:border-transparent transition-all hover:bg-white/20 mb-2"
            >
              Reset Schedule
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

      {/* Start Live Match Modal */}
      {matchToStart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-theme-card border border-theme-primary/30 rounded-[32px] p-8 w-full max-w-sm shadow-[0_0_50px_rgba(10,132,255,0.15)] flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-theme-primary animate-pulse"></div>
            
            <h3 className="text-white font-black text-2xl mb-4 tracking-tight text-center">Start Match {matchToStart.matchNumber || '-'}?</h3>
            
            <div className="w-16 h-16 rounded-full bg-theme-primary/20 flex items-center justify-center text-theme-primary mb-4 text-3xl shadow-inner border border-theme-primary/20">
              🏏
            </div>
            
            <p className="text-white/80 text-base mb-6 text-center font-bold tracking-wide uppercase">
              {teamDict[matchToStart.teamAId]?.name || 'TBA'} <span className="text-[12px] mx-1 text-theme-text/30 italic">vs</span> {teamDict[matchToStart.teamBId]?.name || 'TBA'}
            </p>

            {/* Toss / Batting Selection */}
            <div className="w-full mb-6 relative z-10">
              <select 
                className="w-full bg-black/60 border border-theme-primary/30 rounded-2xl px-4 py-3.5 text-sm font-bold text-white focus:border-theme-primary focus:outline-none appearance-none cursor-pointer shadow-inner"
                value={battingTeam} 
                onChange={e => setBattingTeam(e.target.value)}
              >
                <option value="" disabled className="bg-theme-background">Select Batting Team</option>
                <option value={matchToStart.teamAId} className="bg-theme-background font-bold tracking-wide">{teamDict[matchToStart.teamAId]?.name || 'Team A'} Bats First</option>
                <option value={matchToStart.teamBId} className="bg-theme-background font-bold tracking-wide">{teamDict[matchToStart.teamBId]?.name || 'Team B'} Bats First</option>
              </select>
            </div>

            <div className="flex gap-3 w-full relative z-10">
              <button 
                onClick={() => { setMatchToStart(null); setBattingTeam(''); }} 
                disabled={isSaving} 
                className="flex-[0.8] px-4 py-3.5 rounded-2xl bg-white/5 text-white text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-transform border border-white/10 hover:bg-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={handleStartLiveMatch} 
                disabled={isSaving || !battingTeam} 
                className="flex-[1.2] px-4 py-3.5 rounded-2xl bg-theme-primary text-white text-[11px] font-black uppercase tracking-widest active:scale-95 shadow-[0_4px_20px_rgba(10,132,255,0.4)] disabled:opacity-30 disabled:grayscale transition-all hover:shadow-[0_4px_24px_rgba(10,132,255,0.5)] border border-theme-primary"
              >
                {isSaving ? 'Initializing...' : 'Start Live Match'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminMatches;
