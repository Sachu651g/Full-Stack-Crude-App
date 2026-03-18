// JackChat.jsx — Jack AI floating chatbot
import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client.js';

function injectChatStyles() {
  if (document.getElementById('jack-chat-styles')) return;
  const s = document.createElement('style');
  s.id = 'jack-chat-styles';
  s.textContent = `
    @keyframes jack-pop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
    @keyframes jack-slide { 0%{transform:translateY(20px);opacity:0} 100%{transform:translateY(0);opacity:1} }
    @keyframes jack-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)} 50%{box-shadow:0 0 0 10px rgba(99,102,241,0)} }
    @keyframes jack-dot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
    @keyframes jack-glow { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.4),0 8px 32px rgba(0,0,0,0.5)} 50%{box-shadow:0 0 40px rgba(99,102,241,0.7),0 8px 32px rgba(0,0,0,0.5)} }
    .jack-msg-user { animation: jack-slide 0.25s ease both; }
    .jack-msg-bot  { animation: jack-slide 0.25s ease both; }
    .jack-send:hover:not(:disabled) { background: linear-gradient(135deg,#7c3aed,#4f46e5) !important; transform:scale(1.05); }
    .jack-send { transition: all 0.15s; }
    .jack-fab:hover { transform: scale(1.1) !important; }
    .jack-fab { transition: transform 0.2s !important; }
    .jack-input:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important; outline: none !important; }
    .jack-suggestion:hover { background: rgba(99,102,241,0.15) !important; border-color: rgba(99,102,241,0.4) !important; }
  `;
  document.head.appendChild(s);
}

const SUGGESTIONS = [
  'How is my savings rate?',
  'Tips to reduce expenses',
  'How do I add a transaction?',
  'Explain the 50/30/20 rule',
  'Where can I see my reports?',
];

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:'4px', alignItems:'center', padding:'4px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:'7px', height:'7px', borderRadius:'50%',
          background:'rgba(165,180,252,0.6)',
          animation:`jack-dot 1.2s ${i*0.2}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  // Render markdown-like bold (**text**) and line breaks
  const formatted = msg.text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');

  return (
    <div className={isUser ? 'jack-msg-user' : 'jack-msg-bot'} style={{
      display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom:'10px',
    }}>
      {!isUser && (
        <div style={{
          width:'28px', height:'28px', borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'13px', fontWeight:'800', color:'#fff',
          marginRight:'8px', marginTop:'2px',
          boxShadow:'0 0 10px rgba(99,102,241,0.4)',
        }}>J</div>
      )}
      <div style={{
        maxWidth:'78%', padding:'10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
          : 'rgba(15,23,42,0.9)',
        border: isUser ? 'none' : '1px solid rgba(99,102,241,0.2)',
        fontSize:'13px', lineHeight:'1.55', color: isUser ? '#fff' : 'rgba(226,232,240,0.9)',
        boxShadow: isUser ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
      }}
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    </div>
  );
}

export default function JackChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hey! I'm **Jack**, your AI financial assistant 👋\n\nI can help you understand your finances, navigate the app, or answer any money-related questions. What's on your mind?" }
  ]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { injectChatStyles(); }, []);

  useEffect(() => {
    // Allow other components to open Jack via custom event
    function handleOpenJack() { setOpen(true); }
    window.addEventListener('open-jack', handleOpenJack);
    return () => window.removeEventListener('open-jack', handleOpenJack);
  }, []);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setInput('');

    const userMsg = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Build history for context (exclude the initial greeting)
    const history = messages.slice(1).map(m => ({ role: m.role, text: m.text }));

    try {
      const res = await apiClient.post('/chat', { message: trimmed, history });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }]);
      if (!open) setUnread(n => n + 1);
    } catch (err) {
      const errText = err?.response?.data?.message || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'bot', text: `⚠️ ${errText}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        className="jack-fab"
        onClick={() => setOpen(p => !p)}
        aria-label="Open Jack AI chat"
        style={{
          position:'fixed', bottom:'28px', right:'28px', zIndex:9000,
          width:'58px', height:'58px', borderRadius:'50%', border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'24px',
          animation: open ? 'none' : 'jack-pulse 2.5s infinite',
          boxShadow:'0 0 20px rgba(99,102,241,0.5), 0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        {open ? '✕' : '🤖'}
        {!open && unread > 0 && (
          <div style={{
            position:'absolute', top:'-2px', right:'-2px',
            width:'18px', height:'18px', borderRadius:'50%',
            background:'#ef4444', fontSize:'10px', fontWeight:'800', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid #020817',
          }}>{unread}</div>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="jack-chat-panel" style={{
          position:'fixed', bottom:'100px', right:'28px', zIndex:8999,
          width:'360px', maxWidth:'calc(100vw - 40px)',
          height:'520px', maxHeight:'calc(100vh - 140px)',
          display:'flex', flexDirection:'column',
          background:'rgba(8,12,28,0.97)', backdropFilter:'blur(24px)',
          border:'1px solid rgba(99,102,241,0.3)', borderRadius:'20px',
          boxShadow:'0 0 40px rgba(99,102,241,0.2), 0 24px 64px rgba(0,0,0,0.6)',
          animation:'jack-pop 0.25s ease both',
          overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding:'16px 18px', borderBottom:'1px solid rgba(99,102,241,0.15)',
            background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))',
            display:'flex', alignItems:'center', gap:'12px', flexShrink:0,
          }}>
            <div style={{
              width:'40px', height:'40px', borderRadius:'50%',
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'18px', fontWeight:'900', color:'#fff',
              boxShadow:'0 0 16px rgba(99,102,241,0.5)', flexShrink:0,
              animation:'jack-glow 3s ease-in-out infinite',
            }}>J</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'15px', fontWeight:'800', color:'#e2e8f0' }}>Jack</div>
              <div style={{ fontSize:'11px', color:'rgba(165,180,252,0.5)', display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', display:'inline-block' }} />
                AI Financial Assistant
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(165,180,252,0.4)', fontSize:'18px', padding:'4px', lineHeight:1 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px', scrollbarWidth:'thin', scrollbarColor:'rgba(99,102,241,0.2) transparent' }}>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div style={{ display:'flex', alignItems:'flex-start', marginBottom:'10px' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'800', color:'#fff', marginRight:'8px', flexShrink:0 }}>J</div>
                <div style={{ padding:'10px 14px', background:'rgba(15,23,42,0.9)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px 16px 16px 4px' }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when no user messages yet) */}
          {messages.length === 1 && (
            <div style={{ padding:'0 16px 10px', display:'flex', flexWrap:'wrap', gap:'6px', flexShrink:0 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} className="jack-suggestion" onClick={() => sendMessage(s)} style={{
                  padding:'5px 10px', fontSize:'11px', borderRadius:'20px', cursor:'pointer',
                  background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
                  color:'rgba(165,180,252,0.7)', transition:'all 0.15s',
                }}>{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(99,102,241,0.12)', display:'flex', gap:'8px', flexShrink:0 }}>
            <textarea
              ref={inputRef}
              className="jack-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Jack anything..."
              rows={1}
              style={{
                flex:1, padding:'10px 12px', fontSize:'13px', resize:'none',
                background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
                borderRadius:'12px', color:'#e2e8f0', lineHeight:'1.4',
                maxHeight:'80px', overflowY:'auto', transition:'border-color 0.2s, box-shadow 0.2s',
                fontFamily:'inherit',
              }}
            />
            <button
              className="jack-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width:'40px', height:'40px', borderRadius:'12px', border:'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                background: loading || !input.trim() ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                color:'#fff', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, alignSelf:'flex-end',
                boxShadow: loading || !input.trim() ? 'none' : '0 0 12px rgba(99,102,241,0.4)',
              }}
            >➤</button>
          </div>
        </div>
      )}
    </>
  );
}
