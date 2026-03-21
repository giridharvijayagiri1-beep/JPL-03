// src/App.jsx
import React, { useState } from 'react';
import Home from './pages/user/Home';
import Matches from './pages/user/Matches';
import PointsTable from './pages/user/PointsTable';
import Teams from './pages/user/Teams';
import AdminHome from './pages/admin/AdminHome';
import AdminMatches from './pages/admin/AdminMatches';
import AdminPointsTable from './pages/admin/AdminPointsTable';
import AdminTeams from './pages/admin/AdminTeams';
import Navbar from './components/common/Navbar';
import LiveMatchDetails from './pages/user/LiveMatchDetails';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // Render main admin content natively according to activeTab
  const renderAdminContent = () => {
    switch (activeTab) {
      case 'home': return <AdminHome onNavigate={setActiveTab} />;
      case 'matches': return <AdminMatches onNavigate={setActiveTab} />;
      case 'points': return <AdminPointsTable />;
      case 'teams': return <AdminTeams />;
      default: return <AdminHome />;
    }
  };

  // Render main user content natively according to activeTab
  const renderUserContent = () => {
    switch (activeTab) {
      case 'home': return <Home onNavigate={setActiveTab} />;
      case 'matches': return <Matches />;
      case 'points': return <PointsTable />;
      case 'teams': return <Teams />;
      case 'live-score': return <LiveMatchDetails onBack={() => setActiveTab('home')} />;
      default: return <Home onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-theme-background text-theme-text font-sans flex flex-col relative w-full max-w-md mx-auto shadow-2xl overflow-hidden">
      
      {/* Universal Base Header */}
      <header className="flex items-center p-5 border-b border-white/5 bg-theme-background/80 backdrop-blur-xl z-30 sticky top-0">
        <div className="flex items-center gap-3.5 ml-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse shadow-[0_0_10px_rgba(10,132,255,0.4)]"></span>
            <h1 className="text-[22px] font-black tracking-tighter text-white">JPL-03</h1>
          </div>
          <div className="h-5 w-px bg-white/10 mx-1"></div>
          <p className="text-lg text-theme-text font-black uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
            Jammikunta Premier League
          </p>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto w-full p-5 pb-32">
        {isAdmin ? renderAdminContent() : renderUserContent()}
      </main>

      {/* Unified Navigation serving identically for both Admin and User scopes */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

    </div>
  );
}

export default App;
