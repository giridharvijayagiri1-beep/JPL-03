// src/components/user/TeamCard.jsx
import React from 'react';

function TeamCard({ team }) {
  const teamName = team?.name || 'Unknown Team';
  const logo = team?.logoUrl || teamName.substring(0, 3).toUpperCase();
  const hasImage = !!team?.logoUrl;

  return (
    <div className="bg-theme-card p-5 rounded-[24px] border border-white/5 shadow-md flex flex-col items-center justify-center text-center transition-transform active:scale-95 hover:bg-white/[0.02]">
      
      {/* Team Logo / Avatar */}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-4 overflow-hidden border-2 shadow-inner
         ${hasImage ? 'bg-white border-white/20' : 'bg-white/10 border-white/10 text-white'}`}>
        {hasImage ? (
          <img src={logo} alt={teamName} className="w-full h-full object-cover" />
        ) : (
          logo
        )}
      </div>
      
      {/* Team Name Label */}
      <h3 className="text-xs font-semibold text-white tracking-widest uppercase leading-tight line-clamp-2 min-h-[2.5rem] flex items-center">
        {teamName}
      </h3>
      
    </div>
  );
}

export default TeamCard;
