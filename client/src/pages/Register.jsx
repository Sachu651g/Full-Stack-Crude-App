// Register.jsx — User registration page with futuristic AI background
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function injectAnimations() {
  if (document.getElementById('kiro-auth-styles')) return;
  const style = document.createElement('style');
  style.id = 'kiro-auth-styles';
  style.textContent = `
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
    @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.4)} 50%{box-shadow:0 0 40px rgba(99,102,241,0.8),0 0 80px rgba(139,92,246,0.3)} }
    @keyframes particle { 0%{transform:translateY(100vh) scale(0);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(-10vh) scale(1);opacity:0} }
    @keyframes scan { 0%{top:-2px} 100%{top:100%} }
    @keyframes grid-move { 0%{background-position:0 0} 100%{background-position:60px 60px} }
    .auth-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.2) !important; }
    .auth-btn:hover:not(:disabled) { background: linear-gradient(135deg,#7c3aed,#4f46e5) !important; transform: translateY(-1px); box-shadow: 0 8px 25px rgba(99,102,241,0.5) !important; }
  `;
  document.head.appendChild(style);
}

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i, left: Math.random() * 100, delay: Math.random() * 8,
  duration: 6 + Math.random() * 6, size: 2 + Math.random() * 4,
}));

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { injectAnimations(); }, []);

  function validate() {
    const e = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (!password || password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message;
      setApiError(msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', fontSize: '14px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '8px', outline: 'none', color: '#e2e8f0',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'rgba(148,163,184,0.9)' };
  const fieldErrStyle = { fontSize: '12px', color: '#fca5a5', marginTop: '4px' };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflow: 'hidden',
      background: '#020817',
    }}>
      {/* Video background — same as login page */}
      <video autoPlay loop muted playsInline style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}>
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div style={{ position:'absolute', inset:0, background:'rgba(2,8,23,0.65)', zIndex:1 }} />

      {/* Watermark blocker */}
      <div style={{ position:'absolute', bottom:0, right:0, width:'220px', height:'60px', background:'rgba(2,8,23,0.95)', zIndex:2 }} />

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.1, zIndex:2, pointerEvents:'none',
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.6) 1px, transparent 1px)',
        backgroundSize: '60px 60px', animation: 'grid-move 4s linear infinite',
      }} />

      {/* Orbs */}
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(40px)', zIndex:2, pointerEvents:'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)', filter: 'blur(50px)', zIndex:2, pointerEvents:'none' }} />

      {/* Particles */}
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: p.left + '%', bottom: '-10px',
          width: p.size + 'px', height: p.size + 'px', borderRadius: '50%',
          background: p.id % 3 === 0 ? '#6366f1' : p.id % 3 === 1 ? '#8b5cf6' : '#06b6d4',
          animation: `particle ${p.duration}s ${p.delay}s infinite linear`,
          zIndex:3, pointerEvents:'none',
        }} />
      ))}

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', margin: '16px',
        background: 'rgba(15,15,35,0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px',
        padding: '36px', boxSizing: 'border-box',
        animation: 'glow 3s ease-in-out infinite', overflow: 'hidden',
      }}>
        {/* Scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)',
          animation: 'scan 3s linear infinite', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '60px', height: '60px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            fontSize: '26px', marginBottom: '14px',
            boxShadow: '0 0 30px rgba(99,102,241,0.5)',
            animation: 'float 3s ease-in-out infinite',
          }}>💰</div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#fff' }}>Create an account</h1>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: 'rgba(148,163,184,0.8)' }}>Start tracking your expenses today.</p>
        </div>

        {apiError && (
          <div role="alert" style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '12px 14px', marginBottom: '18px',
            fontSize: '13px', color: '#fca5a5',
          }}>{apiError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email address</label>
            <input className="auth-input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
            {errors.email && <p style={fieldErrStyle}>{errors.email}</p>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Password</label>
            <input className="auth-input" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
            {errors.password && <p style={fieldErrStyle}>{errors.password}</p>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Confirm password</label>
            <input className="auth-input" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} required />
            {errors.confirm && <p style={fieldErrStyle}>{errors.confirm}</p>}
          </div>

          <button
            className="auth-btn"
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', fontSize: '15px', fontWeight: '600',
              color: '#fff', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #4f46e5, #6d28d9)',
              transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
            }}
          >
            {loading ? '⟳ Creating account…' : 'Create account →'}
          </button>
        </form>

        <p style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px', color: 'rgba(148,163,184,0.7)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
