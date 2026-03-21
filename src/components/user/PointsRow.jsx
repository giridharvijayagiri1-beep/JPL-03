// src/components/user/PointsRow.jsx
import React from 'react';

function PointsRow({ rank, ptData, teamMeta }) {
  const isTop4 = rank <= 4;
  
  // Safe extraction matching firebase team model schema
  const teamName = teamMeta?.name || 'Unknown Team';
  const logo = teamMeta?.logoUrl || teamName.substring(0, 3).toUpperCase();
  const hasImage = !!teamMeta?.logoUrl;

  return (
    <div className={`flex items-center justify-between p-3 mb-2.5 rounded-[16px] border transition-all 
      ${isTop4 ? 'bg-theme-primary/10 border-theme-primary/30 shadow-sm' : 'bg-white/[0.02] border-white/5'}`}>
      
      {/* Dynamic Team Header (Left Side) - Flexible Width */}
      <div className="flex items-center gap-6 flex-[2] min-w-0">
        
        {/* Positional Rank */}
        <div className={`w-6 text-center text-xs font-bold ${isTop4 ? 'text-white' : 'text-theme-text/50'}`}>
          {rank}
        </div>
        
        {/* Team Name Display */}
        <span className="text-sm font-semibold text-white truncate pr-2 uppercase tracking-tight">
          {teamName}
        </span>
      </div>

      {/* Structured Stats (Right Side) - Fixed layout width */}
      <div className="flex items-center justify-between flex-[1.7] text-xs font-bold font-mono tracking-tight">
        <div className="w-8 text-center text-theme-text/80">{ptData.matches || 0}</div>
        <div className="w-8 text-center text-green-500">{ptData.wins || 0}</div>
        <div className="w-8 text-center text-red-500/80">{ptData.losses || 0}</div>
        <div className="w-8 text-center text-theme-primary text-sm bg-theme-primary/10 rounded-lg py-1">{ptData.points || 0}</div>
        <div className="w-10 text-center font-black text-theme-text/70">{ptData.nrr ? (ptData.nrr > 0 ? '+' : '') + ptData.nrr.toFixed(3) : '0.000'}</div>
      </div>
      
    </div>
  );
}

export default PointsRow;
