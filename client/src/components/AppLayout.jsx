// AppLayout.jsx — Futuristic AI-themed persistent sidebar layout with video background
import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import JackChat from './JackChat.jsx';

function injectLayoutStyles() {
  if (document.getElementById('kiro-layout-styles')) return;
  const style = document.createElement('style');
  style.id = 'kiro-layout-styles';
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #020817; overflow-x: hidden; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes grid-move { 0%{background-position:0 0} 100%{background-position:60px 60px} }
    @keyframes particle { 0%{transform:translateY(100vh) scale(0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(-10vh) scale(1);opacity:0} }
    @keyframes orb-pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.08)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes scan { 0%{top:-2px} 100%{top:100%} }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }

    .kiro-nav-link.active {
      background: linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1)) !important;
      border-left: 3px solid rgba(99,102,241,0.7) !important;
      color: rgba(165,180,252,0.85) !important;
    }
    .kiro-nav-link:not(.active):hover {
      background: rgba(99,102,241,0.08) !important;
      color: rgba(196,181,253,0.7) !important;
    }
    .kiro-nav-link { border-left: 3px solid transparent; transition: all 0.2s; }

    /* Dark styled selects and inputs everywhere */
    select, input[type=date], input[type=text], input[type=number], input[type=email], input[type=password], textarea {
      color-scheme: dark;
      background-color: rgba(99,102,241,0.08) !important;
      color: #e2e8f0 !important;
      border-color: rgba(99,102,241,0.25) !important;
    }
    select option {
      background: #0a0f1e !important;
      color: #e2e8f0 !important;
    }
    select:focus, input:focus, textarea:focus {
      outline: none !important;
      border-color: rgba(99,102,241,0.6) !important;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important;
    }

    input[type=date]::-webkit-calendar-picker-indicator {
      filter: invert(0.6) sepia(1) saturate(3) hue-rotate(200deg);
      cursor: pointer;
    }

    .futuristic-btn:hover { transform:translateY(-1px); box-shadow:0 0 20px rgba(99,102,241,0.5) !important; }
    .futuristic-btn { transition:all 0.2s; }
    .card-hover:hover { transform:translateY(-3px); box-shadow:0 8px 32px rgba(99,102,241,0.25) !important; }
    .card-hover { transition:all 0.25s; }

    @media (max-width: 767px) {
      .kiro-sidebar { display:none !important; }
      .kiro-topbar  { display:flex !important; }
      .kiro-main    { margin-left:0 !important; }
      .kiro-mobile-nav.open { display:flex !important; }
      .jack-fab { bottom:16px !important; right:16px !important; width:50px !important; height:50px !important; font-size:20px !important; }
      .jack-chat-panel { bottom:80px !important; right:8px !important; width:calc(100vw - 16px) !important; max-width:100% !important; }
    }
    @media (min-width: 768px) {
      .kiro-topbar     { display:none !important; }
      .kiro-mobile-nav { display:none !important; }
    }
    /* Smooth scrolling on mobile */
    @media (max-width: 767px) {
      .kiro-main { -webkit-overflow-scrolling: touch; }
    }
    /* Tighter page padding on mobile */
    @media (max-width: 480px) {
      .kiro-main > * { padding-left: 16px !important; padding-right: 16px !important; }
    }
  `;
  document.head.appendChild(style);
}

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',    icon: '⬡', desc: 'Overview' },
  { to: '/transactions', label: 'Transactions', icon: '⟳', desc: 'History' },
  { to: '/categories',   label: 'Categories',   icon: '◈', desc: 'Manage' },
  { to: '/reports',      label: 'Reports',      icon: '◉', desc: 'Analytics' },
  { to: '/profile',      label: 'Profile',      icon: '👤', desc: 'Settings' },
];

// Generate stable particles once
const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  left: (i * 4.1) % 100,
  delay: (i * 0.37) % 8,
  duration: 7 + (i * 0.3) % 6,
  size: 2 + (i % 4),
  color: i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#8b5cf6' : '#06b6d4',
}));

function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    injectLayoutStyles();
    if (videoRef.current) videoRef.current.play().catch(() => {});
    // Load display name from profile storage
    function loadName() {
      try {
        const p = JSON.parse(localStorage.getItem('nexus_profile') || '{}');
        if (p.displayName) setDisplayName(p.displayName);
        else setDisplayName('');
      } catch {}
    }
    loadName();
    window.addEventListener('profile-updated', loadName);
    return () => window.removeEventListener('profile-updated', loadName);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleLogout() { logout(); navigate('/login'); }

  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={{ display:'flex', minHeight:'100vh', backgroundColor:'#020817', fontFamily:"'Inter',system-ui,sans-serif", position:'relative', overflow:'hidden' }}>

      {/* ── Video background ── */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          position:'fixed', inset:0, width:'100%', height:'100%',
          objectFit:'cover', zIndex:0, pointerEvents:'none',
        }}
      >
        <source src="/videos/dashboard-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay — heavy enough to suppress video watermark text */}
      <div style={{position:'fixed',inset:0,background:'rgba(2,8,23,0.85)',zIndex:1,pointerEvents:'none'}} />
      {/* Extra gradient at bottom to further suppress any bottom watermark */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,height:'30%',background:'linear-gradient(to top,rgba(2,8,23,0.95) 0%,transparent 100%)',zIndex:1,pointerEvents:'none'}} />

      {/* Animated grid overlay */}
      <div style={{
        position:'fixed', inset:0, zIndex:2, pointerEvents:'none',
        opacity:0.08,
        backgroundImage:'linear-gradient(rgba(99,102,241,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.6) 1px,transparent 1px)',
        backgroundSize:'60px 60px',
        animation:'grid-move 5s linear infinite',
      }} />
      {/* Glowing orbs */}
      <div style={{position:'fixed',top:'10%',left:'15%',width:'400px',height:'400px',borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none',zIndex:2,animation:'orb-pulse 8s ease-in-out infinite'}} />
      <div style={{position:'fixed',bottom:'15%',right:'10%',width:'500px',height:'500px',borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)',filter:'blur(50px)',pointerEvents:'none',zIndex:2,animation:'orb-pulse 11s ease-in-out infinite reverse'}} />
      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position:'fixed', left:p.left+'%', bottom:'-10px',
          width:p.size+'px', height:p.size+'px', borderRadius:'50%',
          background:p.color, pointerEvents:'none', zIndex:2,
          animation:`particle ${p.duration}s ${p.delay}s infinite linear`,
          boxShadow:`0 0 ${p.size*2}px ${p.color}`,
        }} />
      ))}
      {/* Scan line */}
      <div style={{position:'fixed',left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent)',animation:'scan 6s linear infinite',pointerEvents:'none',zIndex:2}} />

      {/* ── Sidebar ── */}
      <nav className="kiro-sidebar" style={{
        width:'240px', minWidth:'240px',
        background:'rgba(5,8,20,0.85)', backdropFilter:'blur(20px)',
        display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:100,
        borderRight:'1px solid rgba(99,102,241,0.2)',
      }}>
        {/* Brand */}
        <div style={{padding:'24px 20px 18px',borderBottom:'1px solid rgba(99,102,241,0.15)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
            <div style={{width:'38px',height:'38px',borderRadius:'12px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'900',color:'#fff',boxShadow:'0 0 20px rgba(99,102,241,0.5)',animation:'float 3s ease-in-out infinite',flexShrink:0}}>J</div>
            <div>
              <div style={{fontSize:'15px',fontWeight:'800',background:'linear-gradient(135deg,#a5b4fc,#c4b5fd)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',letterSpacing:'-0.02em'}}>NexusFinance</div>
              <div style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',letterSpacing:'0.15em',textTransform:'uppercase'}}>Jack AI Inside</div>
            </div>          </div>
          {/* Live clock */}
          <div style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.18)',borderRadius:'8px',padding:'8px 12px'}}>
            <div style={{fontSize:'17px',fontWeight:'700',color:'#a5b4fc',fontVariantNumeric:'tabular-nums',letterSpacing:'0.05em'}}>{timeStr}</div>
            <div style={{fontSize:'11px',color:'rgba(165,180,252,0.4)',marginTop:'1px'}}>{dateStr}</div>
          </div>
        </div>

        {/* Nav links */}
        <ul style={{listStyle:'none',padding:'12px 10px',flex:1,overflowY:'auto'}}>
          {NAV_ITEMS.map(({ to, label, icon, desc }) => (
            <li key={to} style={{marginBottom:'3px'}}>
              <NavLink to={to} className="kiro-nav-link" style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',borderRadius:'8px',textDecoration:'none',fontSize:'13px',fontWeight:'400',color:'rgba(148,163,184,0.45)'}}>
                <span style={{fontSize:'15px',width:'22px',textAlign:'center',lineHeight:1,flexShrink:0,opacity:0.6}}>{icon}</span>
                <div>
                  <div style={{lineHeight:1.2}}>{label}</div>
                  <div style={{fontSize:'10px',opacity:0.45,marginTop:'1px'}}>{desc}</div>
                </div>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div style={{padding:'14px 16px',borderTop:'1px solid rgba(99,102,241,0.15)'}}>
          <div style={{background:'rgba(99,102,241,0.07)',border:'1px solid rgba(99,102,241,0.14)',borderRadius:'8px',padding:'9px 12px',marginBottom:'10px'}}>
            <div style={{fontSize:'10px',color:'rgba(165,180,252,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'2px'}}>Logged in as</div>
            {displayName && <div style={{fontSize:'13px',color:'#c4b5fd',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'1px'}}>{displayName}</div>}
            <div style={{fontSize:'11px',color:'rgba(165,180,252,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email || 'User'}</div>
          </div>
          <button className="futuristic-btn" onClick={handleLogout} style={{width:'100%',padding:'9px 14px',fontSize:'13px',fontWeight:'600',color:'#fca5a5',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:'8px',cursor:'pointer',textAlign:'center'}}>
            ⏻ Sign Out
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="kiro-main" style={{flex:1,marginLeft:'240px',minWidth:0,position:'relative',zIndex:10}}>
        {/* Mobile topbar */}
        <header className="kiro-topbar" style={{display:'none',alignItems:'center',justifyContent:'space-between',padding:'0 16px',height:'56px',background:'rgba(5,8,20,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(99,102,241,0.2)',position:'sticky',top:0,zIndex:200}}>
          <span style={{fontSize:'15px',fontWeight:'800',background:'linear-gradient(135deg,#a5b4fc,#c4b5fd)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>NexusFinance</span>
          <button onClick={()=>setMobileOpen(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',padding:'6px',display:'flex',flexDirection:'column',gap:'5px'}}>
            {[0,1,2].map(i=><span key={i} style={{width:'22px',height:'2px',backgroundColor:'#a5b4fc',borderRadius:'2px',display:'block'}} />)}
          </button>
        </header>
        {/* Mobile nav drawer */}
        <nav className={`kiro-mobile-nav${mobileOpen?' open':''}`} style={{display:'none',flexDirection:'column',background:'rgba(5,8,20,0.95)',backdropFilter:'blur(20px)',padding:'8px 12px 16px',position:'sticky',top:'56px',zIndex:199,borderBottom:'1px solid rgba(99,102,241,0.2)'}}>
          {NAV_ITEMS.map(({to,label,icon})=>(
            <NavLink key={to} to={to} className="kiro-nav-link" onClick={()=>setMobileOpen(false)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 14px',borderRadius:'8px',textDecoration:'none',fontSize:'15px',fontWeight:'500',color:'rgba(165,180,252,0.7)',marginBottom:'2px'}}>
              <span>{icon}</span>{label}
            </NavLink>
          ))}
          <button onClick={handleLogout} style={{marginTop:'8px',padding:'10px 14px',fontSize:'14px',fontWeight:'600',color:'#fca5a5',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:'8px',cursor:'pointer',textAlign:'left',width:'100%'}}>⏻ Sign Out</button>
        </nav>
        <Outlet />
      </div>

      {/* Jack AI floating chatbot */}
      <JackChat />
    </div>
  );
}

export default AppLayout;
