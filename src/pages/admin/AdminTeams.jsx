// src/pages/admin/AdminTeams.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [localTeams, setLocalTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'teams'), (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setTeams(arr);

      if (!editMode) {
        const local = {};
        arr.forEach(t => local[t.id] = t);
        setLocalTeams(local);
      }
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [editMode]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const t of Object.values(localTeams)) {
        const original = teams.find(orig => orig.id === t.id);
        if (!original || JSON.stringify(original) !== JSON.stringify(t)) {
          if (!t.id.startsWith('temp_')) {
            await updateDoc(doc(db, 'teams', t.id), {
              name: t.name,
              players: t.players || []
            });
          }
        }
      }
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setError("Failed to push updates securely to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEdit = () => {
    if (editMode) {
      handleSave();
    } else {
      const local = {};
      teams.forEach(t => local[t.id] = t);
      setLocalTeams(local);
      setEditMode(true);
      if (teams.length > 0) setExpandedTeam(teams[0].id); // Auto-expand first in edit mode
    }
  };

  const handleAddTeam = async () => {
    try {
      const res = await addDoc(collection(db, 'teams'), {
        name: "New Team",
        players: [],
        logoUrl: ""
      });
      setLocalTeams(prev => ({
        ...prev,
        [res.id]: { id: res.id, name: "New Team", players: [], logoUrl: "" }
      }));
      setExpandedTeam(res.id);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    const id = teamToDelete.id;
    try {
      if (!id.startsWith('temp_')) {
        await deleteDoc(doc(db, 'teams', id));
      }
      setLocalTeams(prev => {
        const nw = { ...prev };
        delete nw[id];
        return nw;
      });
    } catch (err) {}
    setTeamToDelete(null);
    setDeleteConfirmText('');
  };

  const handleUpdateTeamName = (id, newName) => {
    setLocalTeams(prev => ({ ...prev, [id]: { ...prev[id], name: newName } }));
  };

  const handleAddPlayer = (teamId, role) => {
    setLocalTeams(prev => {
      const team = { ...prev[teamId] };
      const p = team.players ? [...team.players] : [];
      p.push({ id: `p_${Date.now()}_${Math.random()}`, name: "", role });
      return { ...prev, [teamId]: { ...team, players: p } };
    });
  };

  const handleUpdatePlayer = (teamId, playerId, newName) => {
    setLocalTeams(prev => {
      const team = { ...prev[teamId] };
      const p = team.players.map(pl => pl.id === playerId ? { ...pl, name: newName } : pl);
      return { ...prev, [teamId]: { ...team, players: p } };
    });
  };

  const handleDeletePlayer = (teamId, playerId) => {
    setLocalTeams(prev => {
      const team = { ...prev[teamId] };
      const p = team.players.filter(pl => pl.id !== playerId);
      return { ...prev, [teamId]: { ...team, players: p } };
    });
  };

  const displayTeams = editMode ? Object.values(localTeams) : teams;

  return (
    <div className="flex flex-col animate-fade-in w-full pb-10">
      <div className="mb-4 sticky top-[-20px] bg-theme-background/90 backdrop-blur-lg pt-2 pb-4 z-20 flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Manage Teams</h2>
        {isSaving && <span className="text-xs text-theme-primary font-bold animate-pulse">Syncing...</span>}
      </div>

      {error && (
        <div className="bg-theme-card p-4 rounded-xl border border-red-500/20 text-center mb-4 text-xs font-medium text-red-400">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12">
          <span className="w-8 h-8 rounded-full border-2 border-theme-primary/30 border-t-theme-primary animate-spin mb-4"></span>
          <span className="text-sm font-medium text-theme-text/50">Fetching directory...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-[100px]">
          {displayTeams.map(t => {
            const isExpanded = expandedTeam === t.id;
            const logo = t.logoUrl || "1";
            return (
              <div key={t.id} className="bg-theme-card border border-white/5 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 relative">
                
                {/* Accordion Header */}
                <div 
                  onClick={() => !editMode && setExpandedTeam(isExpanded ? null : t.id)}
                  className={`flex items-center justify-between p-4 ${isExpanded ? 'bg-white/5 border-b border-white/5' : ''} ${!editMode && 'cursor-pointer hover:bg-white/[0.02]'}`}
                >
                  {editMode ? (
                    <div className="flex items-center gap-2 sm:gap-3 w-full">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden shadow-inner">
                        {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover"/> : '🛡️'}
                      </div>
                      <input 
                        value={t.name}
                        onChange={(e) => handleUpdateTeamName(t.id, e.target.value)}
                        placeholder="Team Name"
                        className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-2 sm:px-3 py-2 text-white font-bold focus:outline-none focus:border-theme-primary/50 text-sm sm:text-base"
                      />
                      <button onClick={() => setTeamToDelete(t)} className="w-8 sm:w-9 h-8 sm:h-9 flex items-center justify-center shrink-0 bg-transparent text-white rounded-lg border border-white/20 active:scale-95 transition-all hover:bg-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setExpandedTeam(isExpanded ? null : t.id)} 
                        className="group w-8 h-8 flex items-center justify-center shrink-0 text-white/40 hover:text-white transition-all duration-300 ease-in-out mr-2"
                      >
                        <svg 
                          xmlns="http://w3.org" 
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
                  ) : (
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
                  )}
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
                            {editMode && (
                              <button onClick={() => handleAddPlayer(t.id, role)} className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 active:scale-95 text-[14px] leading-none transition-all hover:bg-white/20">
                                +
                              </button>
                            )}
                          </div>
                          
                          {/* Player List */}
                          <div className="flex flex-col gap-2">
                            {rolePlayers.length === 0 && !editMode && <div className="text-white/20 pl-4 italic text-xs">No {role.toLowerCase()}s recorded</div>}
                            
                            {rolePlayers.map(p => (
                              <div key={p.id} className={`flex items-center gap-3 px-2 ${editMode && 'bg-white/[0.03] rounded-lg p-1 pr-2'}`}>
                                <span className="text-[16px] opacity-80 w-5 text-center">{role === 'Batsman' ? '🏏' : role === 'Bowler' ? '🔴' : '👤'}</span>
                                {editMode ? (
                                  <>
                                    <input 
                                      value={p.name}
                                      onChange={(e) => handleUpdatePlayer(t.id, p.id, e.target.value)}
                                      placeholder={`Enter ${role.toLowerCase()} name`}
                                      className="flex-1 bg-transparent border-b border-white/10 px-2 py-1.5 text-white focus:outline-none focus:border-theme-primary/50 text-sm transition-colors"
                                    />
                                    <button onClick={() => handleDeletePlayer(t.id, p.id)} className="w-6 h-6 flex items-center justify-center bg-transparent text-white border border-white/30 rounded-full active:scale-95 shadow-md leading-none text-lg hover:bg-white/10">
                                      -
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-white/90 font-medium">{p.name || 'Unnamed Player'}</span>
                                )}
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

          {/* Add Team Global Button */ }
          {editMode && (
             <button onClick={handleAddTeam} className="w-full mt-2 bg-theme-primary/10 border border-theme-primary/30 border-dashed rounded-[20px] py-5 text-theme-primary font-black uppercase tracking-[0.2em] active:scale-95 transition-all shadow-inner hover:bg-theme-primary/20 flex flex-col items-center justify-center gap-1">
               <span className="text-2xl leading-none">+</span>
               New Team
             </button>
          )}

          {teams.length === 0 && !editMode && (
            <div className="text-center p-6 text-xs text-theme-text/40">No teams exist. Click edit to create one.</div>
          )}
        </div>
      )}

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

      {/* Danger Zone Delete Team Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-background border border-white/10 rounded-[28px] p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white mb-4 text-2xl">⚠️</div>
            <h3 className="text-white font-bold text-xl mb-2">Delete Team?</h3>
            <p className="text-theme-text/70 text-sm mb-4 leading-relaxed">
              This will permanently delete <b>{teamToDelete.name}</b> and their player roster. This cannot be undone.
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
              onClick={confirmDeleteTeam}
              disabled={deleteConfirmText !== 'DELETE'}
              className="w-full bg-white/10 text-white font-black tracking-widest uppercase py-3.5 rounded-xl border border-white/20 disabled:opacity-30 disabled:border-transparent transition-all hover:bg-white/20 mb-2"
            >
              Delete Team
            </button>
            <button 
              onClick={() => {
                setTeamToDelete(null);
                setDeleteConfirmText('');
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

export default AdminTeams;
