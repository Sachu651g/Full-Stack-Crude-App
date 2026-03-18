// Profile.jsx — User profile: display name + language (persisted to localStorage)
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export const STORAGE_KEY = 'nexus_profile';

export const LANGUAGES = [
  { code: 'en',  label: 'English',    flag: '🇺🇸' },
  { code: 'hi',  label: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'kn',  label: 'ಕನ್ನಡ',       flag: '🇮🇳' },
  { code: 'te',  label: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'es',  label: 'Español',    flag: '🇪🇸' },
  { code: 'fr',  label: 'Français',   flag: '🇫🇷' },
  { code: 'de',  label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh',  label: '中文',        flag: '🇨🇳' },
  { code: 'ar',  label: 'العربية',    flag: '🇸🇦' },
  { code: 'pt',  label: 'Português',  flag: '🇧🇷' },
  { code: 'ja',  label: '日本語',      flag: '🇯🇵' },
  { code: 'ko',  label: '한국어',      flag: '🇰🇷' },
];

export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function injectStyles() {
  if (document.getElementById('kiro-profile-styles')) return;
  const s = document.createElement('style');
  s.id = 'kiro-profile-styles';
  s.textContent = `
    @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    .lang-option:hover { background:rgba(99,102,241,0.14) !important; border-color:rgba(99,102,241,0.45) !important; }
    .profile-input:focus { border-color:rgba(99,102,241,0.6) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.15) !important; outline:none !important; }
  `;
  document.head.appendChild(s);
}

export default function Profile() {
  const { user } = useAuth();
  // Use a ref to always have the latest displayName in save handler
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);
  const langRef = useRef('en');

  // Keep ref in sync
  langRef.current = language;

  // Load saved profile on mount
  useEffect(() => {
    injectStyles();
    const p = loadProfile();
    setDisplayName(p.displayName || '');
    setLanguage(p.language || 'en');
  }, []);

  // Auto-save language immediately on click
  function handleLanguageSelect(code) {
    setLanguage(code);
    langRef.current = code;
    const current = loadProfile();
    const updated = { ...current, language: code };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('profile-updated'));
  }

  function handleSave(e) {
    e.preventDefault();
    const trimmed = displayName.trim();
    // Read fresh from storage, merge, write back
    const current = loadProfile();
    const updated = { ...current, displayName: trimmed, language: langRef.current };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('profile-updated'));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const initials = displayName.trim()
    ? displayName.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div style={{ minHeight:'100vh', backgroundColor:'transparent', fontFamily:"'Inter',system-ui,sans-serif", padding:'32px 28px', boxSizing:'border-box' }}>
      <div style={{ position:'relative', zIndex:1, maxWidth:'640px' }}>

        {/* Header */}
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'12px', color:'rgba(99,102,241,0.8)', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'6px', fontWeight:'600' }}>◈ JACK AI</div>
          <h1 style={{ margin:0, fontSize:'32px', fontWeight:'800', color:'#e2e8f0', letterSpacing:'-0.02em' }}>Profile</h1>
          <p style={{ margin:'6px 0 0', fontSize:'14px', color:'rgba(165,180,252,0.5)' }}>Manage your personal details and preferences</p>
        </div>

        {/* Avatar card */}
        <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'28px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'20px', animation:'fadeInUp 0.4s ease both' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'800', color:'#fff', boxShadow:'0 0 24px rgba(99,102,241,0.5)', flexShrink:0, animation:'float 3s ease-in-out infinite' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:'#e2e8f0' }}>{displayName.trim() || 'Your Name'}</div>
            <div style={{ fontSize:'13px', color:'rgba(165,180,252,0.5)', marginTop:'3px' }}>{user?.email}</div>
            <div style={{ fontSize:'11px', color:'rgba(99,102,241,0.6)', marginTop:'4px' }}>
              {currentLang.flag} {currentLang.label}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* Personal details */}
          <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'24px', marginBottom:'20px', animation:'fadeInUp 0.4s ease 0.1s both' }}>
            <div style={{ fontSize:'12px', color:'rgba(165,180,252,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'20px', fontWeight:'600' }}>Personal Details</div>

            <div style={{ marginBottom:'18px' }}>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'rgba(148,163,184,0.8)', marginBottom:'7px' }}>Display Name</label>
              <input
                className="profile-input"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={60}
                style={{ width:'100%', padding:'11px 14px', fontSize:'14px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'10px', color:'#e2e8f0', boxSizing:'border-box', transition:'border-color 0.2s, box-shadow 0.2s' }}
              />
            </div>

            <div>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'rgba(148,163,184,0.8)', marginBottom:'7px' }}>Email Address</label>
              <input type="email" value={user?.email || ''} readOnly
                style={{ width:'100%', padding:'11px 14px', fontSize:'14px', background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.12)', borderRadius:'10px', color:'rgba(165,180,252,0.4)', boxSizing:'border-box', cursor:'not-allowed' }} />
              <p style={{ fontSize:'11px', color:'rgba(148,163,184,0.35)', marginTop:'5px' }}>Email cannot be changed</p>
            </div>
          </div>

          {/* Language — auto-saves on click */}
          <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'24px', marginBottom:'20px', animation:'fadeInUp 0.4s ease 0.15s both' }}>
            <div style={{ fontSize:'12px', color:'rgba(165,180,252,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px', fontWeight:'600' }}>Language Preference</div>
            <p style={{ fontSize:'12px', color:'rgba(148,163,184,0.4)', marginBottom:'16px', marginTop:0 }}>Jack AI will respond in your selected language · saves automatically</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'10px' }}>
              {LANGUAGES.map(lang => (
                <button key={lang.code} type="button" className="lang-option"
                  onClick={() => handleLanguageSelect(lang.code)}
                  style={{
                    display:'flex', alignItems:'center', gap:'8px',
                    padding:'10px 14px', borderRadius:'10px', cursor:'pointer',
                    background: language === lang.code ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.06)',
                    border: language === lang.code ? '1px solid rgba(99,102,241,0.65)' : '1px solid rgba(99,102,241,0.15)',
                    color: language === lang.code ? '#a5b4fc' : 'rgba(148,163,184,0.6)',
                    fontSize:'13px', fontWeight: language === lang.code ? '700' : '400',
                    transition:'all 0.15s', textAlign:'left',
                    boxShadow: language === lang.code ? '0 0 12px rgba(99,102,241,0.25)' : 'none',
                  }}>
                  <span style={{ fontSize:'18px' }}>{lang.flag}</span>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {saved && (
            <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', fontSize:'14px', color:'#6ee7b7' }}>
              ✓ Name saved successfully
            </div>
          )}
          <button type="submit" style={{ width:'100%', padding:'13px', fontSize:'15px', fontWeight:'700', color:'#fff', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:'12px', cursor:'pointer', boxShadow:'0 4px 20px rgba(99,102,241,0.4)', transition:'all 0.2s' }}>
            Save Name
          </button>
        </form>
      </div>
    </div>
  );
}
