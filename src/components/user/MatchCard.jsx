// src/components/user/MatchCard.jsx
import React from 'react';

function MatchCard({ match, teamAMeta, teamBMeta }) {
  if (!match) return null;

  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'live';
  
  // Safe failback parsing format
  const tA = teamAMeta || { name: 'TBA' };
  const tB = teamBMeta || { name: 'TBA' };

  return (
    <div className="bg-theme-card p-5 rounded-[24px] border border-white/5 shadow-md flex flex-col mb-4 transition-transform active:scale-[0.98]">
      
      {/* Header Info */}
      <div className="flex justify-between items-center mb-5">
        <span className="text-[11px] font-bold text-theme-text/40 tracking-widest uppercase">
          Match {match.matchNumber || '-'}
        </span>
        <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
          ${isLive ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
            isCompleted ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
            'bg-white/5 text-theme-text/60 border-white/10'}
        `}>
          {isLive ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>LIVE</span> : isCompleted ? 'Completed' : 'Upcoming'}
        </div>
      </div>

      {/* Versus Container */}
      <div className="flex justify-between items-stretch">
        
        {/* Team A side */}
        <div className="flex flex-col items-start flex-1 w-full overflow-hidden">
           <div className="flex items-center gap-3 mb-1.5 w-full">
             <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden border transition-colors
                ${isCompleted && match.winnerTeamId === match.teamAId ? 'border-theme-primary' : 'border-white/10'}
             `}>
               {tA.logoUrl && tA.logoUrl !== 'default-logo.png' ? (
                 <img src={tA.logoUrl} alt={tA.name} className="w-full h-full object-cover" />
               ) : (
                 <span className={`text-[10px] font-bold ${isCompleted && match.winnerTeamId === match.teamAId ? 'text-theme-primary' : 'text-white'}`}>
                   {tA.name.substring(0, 3).toUpperCase()}
                 </span>
               )}
             </div>
              <span className={`text-[13px] font-bold truncate flex-1 uppercase tracking-tight whitespace-nowrap
                 ${isCompleted && match.winnerTeamId === match.teamAId ? 'text-theme-primary' : 'text-theme-text'}`}>
                {tA.name}
              </span>
            </div>
            {isCompleted && match.finalScore?.teamA && (
              <span className="text-xl font-black tracking-tighter text-white pl-12 mt-1 -mb-1">
                {match.finalScore.teamA.runs}<span className="text-sm font-medium text-theme-text/40 mx-0.5">/</span>{match.finalScore.teamA.wickets}
                <span className="text-[10px] text-theme-text/40 ml-1.5 font-medium">{match.finalScore.teamA.overs}v</span>
              </span>
            )}
         </div>

         {/* Separator */}
         <div className="flex flex-col items-center justify-center px-1.5 mt-4 self-start flex-shrink-0">
             <span className="text-[9px] text-theme-text/20 font-black uppercase tracking-widest">VS</span>
         </div>

         {/* Team B side */}
         <div className="flex flex-col items-end flex-1 w-full overflow-hidden">
            <div className="flex items-center justify-end gap-2 mb-1.5 w-full">
              <span className={`text-[13px] font-bold truncate flex-1 text-right uppercase tracking-tight whitespace-nowrap
                 ${isCompleted && match.winnerTeamId === match.teamBId ? 'text-theme-primary' : 'text-theme-text'}`}>
                {tB.name}
              </span>
             <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden border transition-colors
                ${isCompleted && match.winnerTeamId === match.teamBId ? 'border-theme-primary' : 'border-white/10'}
             `}>
               {tB.logoUrl && tB.logoUrl !== 'default-logo.png' ? (
                 <img src={tB.logoUrl} alt={tB.name} className="w-full h-full object-cover" />
               ) : (
                 <span className={`text-[10px] font-bold ${isCompleted && match.winnerTeamId === match.teamBId ? 'text-theme-primary' : 'text-white'}`}>
                   {tB.name.substring(0, 3).toUpperCase()}
                 </span>
               )}
             </div>
           </div>
           {isCompleted && match.finalScore?.teamB && (
             <span className="text-xl font-black tracking-tighter text-white pr-12 mt-1 -mb-1 text-right">
               {match.finalScore.teamB.runs}<span className="text-sm font-medium text-theme-text/40 mx-0.5">/</span>{match.finalScore.teamB.wickets}
               <span className="text-[10px] text-theme-text/40 ml-1.5 font-medium">{match.finalScore.teamB.overs}v</span>
             </span>
           )}
        </div>
        
      </div>

      {/* Winner Summary Footer */}
      {isCompleted && match.winnerTeamId && (
        <div className="mt-5 pt-3 border-t border-white/5 text-center bg-white/[0.02] -mx-5 -mb-5 px-5 pb-3 rounded-b-[24px]">
          <span className="text-[11px] uppercase tracking-wider font-bold text-blue-500/80">
            {match.winnerTeamId === 'DRAW' ? 'Match Drawn' : `${match.winnerTeamId === match.teamAId ? tA.name : tB.name} Won`}
          </span>
        </div>
      )}

    </div>
  );
}

export default MatchCard;
