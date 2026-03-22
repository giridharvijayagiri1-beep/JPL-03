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
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  const handleHeaderClick = () => {
    if (isAdmin) return; // No need to trigger if already admin

    const now = Date.now();
    if (now - lastClickTime < 1000) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 3) {
        setShowLoginModal(true);
        setClickCount(0);
      }
    } else {
      setClickCount(1);
    }
    setLastClickTime(now);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'JPL2026@admin123') {
      setIsAdmin(true);
      setShowLoginModal(false);
      setPassword('');
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

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
      <header className="flex items-center justify-between p-4 border-b border-white/5 bg-theme-background/80 backdrop-blur-xl z-30 sticky top-0 h-16">
        <div 
          className="flex items-center gap-2.5 ml-1 cursor-pointer active:opacity-70 transition-opacity select-none min-w-0"
          onClick={handleHeaderClick}
        >
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-pulse shadow-[0_0_10px_rgba(10,132,255,0.4)]"></span>
            <h1 className="text-xl font-black tracking-tighter text-white whitespace-nowrap">JPL-03</h1>
          </div>
          <div className="h-4 w-px bg-white/10 flex-shrink-0"></div>
          <p className="text-[14px] text-theme-text font-black uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
            Jammikunta Premier League
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsAdmin(false)}
            className="bg-theme-primary/10 text-theme-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-theme-primary/20 animate-fade-in"
          >
            User Mode
          </button>
        )}
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto w-full p-5 pb-32">
        {isAdmin ? renderAdminContent() : renderUserContent()}
      </main>

      {/* Unified Navigation serving identically for both Admin and User scopes */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Hidden Admin Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-lg animate-fade-in">
          <div className="bg-theme-card w-full max-w-[320px] rounded-[32px] p-8 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col items-center">
            <div className="w-16 h-16 bg-theme-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-theme-primary/20">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-xl font-black text-white mb-2 italic">Admin Access</h2>
            <p className="text-theme-text/40 text-[11px] font-bold uppercase tracking-widest mb-8">Enter Master Password</p>
            
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <input 
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-black/40 border ${loginError ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/10'} rounded-2xl px-6 py-4 text-center text-xl tracking-[0.3em] text-white focus:outline-none focus:border-theme-primary transition-all placeholder:text-white/5`}
              />
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowLoginModal(false); setPassword(''); }}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-theme-text/60 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 rounded-2xl bg-theme-primary text-white font-black text-[10px] uppercase tracking-widest shadow-[0_8px_25px_rgba(10,132,255,0.3)] active:scale-95 transition-all"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
