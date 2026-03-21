// src/components/common/Navbar.jsx
import React from 'react';

function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'teams', label: 'Teams' },
    { id: 'matches', label: 'Matches' },
    { id: 'points', label: 'Points Table' }
  ];

  return (
    <nav id="app-navbar" className="fixed bottom-0 w-full max-w-md mx-auto left-0 right-0 p-4 z-50 pointer-events-none">
      <div className="bg-theme-card/90 backdrop-blur-xl border border-white/10 p-2 rounded-full flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 overflow-hidden whitespace-nowrap px-1 py-3 text-center text-[11px] uppercase tracking-wider font-bold rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-theme-primary text-white shadow-md' 
                  : 'text-theme-text/60 hover:text-theme-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navbar;
