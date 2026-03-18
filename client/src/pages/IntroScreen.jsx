// IntroScreen.jsx — Plays the intro video once after login, then redirects to /dashboard.
// The video plays to completion (or user can skip), then navigation happens automatically.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function IntroScreen() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [opacity, setOpacity] = useState(1);

  function goToDashboard() {
    // Fade out then navigate
    setOpacity(0);
    setTimeout(() => navigate('/dashboard', { replace: true }), 600);
  }

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // When video ends, go to dashboard
    vid.addEventListener('ended', goToDashboard);

    // Fallback: if video fails to load, skip after 3s
    const fallback = setTimeout(goToDashboard, 8000);

    vid.play().catch(() => {
      // Autoplay blocked — skip immediately
      clearTimeout(fallback);
      goToDashboard();
    });

    return () => {
      vid.removeEventListener('ended', goToDashboard);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      onClick={goToDashboard}
      style={{
        position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        opacity, transition: 'opacity 0.6s ease',
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="/videos/intro.mp4" type="video/mp4" />
      </video>

      {/* Full overlay — darkens video enough to suppress watermark text */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'rgba(0,0,0,0.55)',
      }} />
      {/* Extra gradient at bottom where "shutterstock" text sits */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
        zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
      }} />
      {/* Top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '25%',
        zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
      }} />

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '13px', color: 'rgba(165,180,252,0.7)',
        background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: '20px',
        backdropFilter: 'blur(8px)', border: '1px solid rgba(99,102,241,0.25)',
        zIndex: 3, pointerEvents: 'none',
      }}>
        Click anywhere to skip
      </div>
    </div>
  );
}

export default IntroScreen;
