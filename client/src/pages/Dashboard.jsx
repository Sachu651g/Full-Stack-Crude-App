// Dashboard.jsx — Futuristic AI-powered financial dashboard
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client.js';

function injectStyles() {
  if (document.getElementById('kiro-dash-styles')) return;
  const s = document.createElement('style');
  s.id = 'kiro-dash-styles';
  s.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes count-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes gridMove { 0%{transform:translateY(0)} 100%{transform:translateY(60px)} }
    @keyframes orb-float { 0%,100%{transform:translate(0,0)} 33%{transform:translate(30px,-20px)} 66%{transform:translate(-20px,15px)} }
    .dash-card:hover { transform:translateY(-4px) !important; box-shadow:0 12px 40px rgba(99,102,241,0.3) !important; }
    .dash-card { transition:all 0.25s ease; }
    .ai-insight { transition:background 0.2s; }
  `;
  document.head.appendChild(s);
}

function formatCurrency(v) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(parseFloat(v)||0);
}

function generateInsights(summary) {
  const income = parseFloat(summary?.totalIncome)||0;
  const expenses = parseFloat(summary?.totalExpenses)||0;
  const net = parseFloat(summary?.netBalance)||0;
  const insights = [];
  if (income > 0) {
    const sr = ((income-expenses)/income*100).toFixed(1);
    if (sr >= 20) insights.push({icon:'??',color:'#10b981',text:`Excellent! Your savings rate is ${sr}% — above the recommended 20%.`});
    else if (sr >= 0) insights.push({icon:'?',color:'#f59e0b',text:`Savings rate is ${sr}%. Try to reach 20% by reducing discretionary spending.`});
    else insights.push({icon:'??',color:'#ef4444',text:`You are spending ${Math.abs(sr)}% more than you earn. Review expenses immediately.`});
  }
  if (expenses > income*0.5 && income > 0) insights.push({icon:'??',color:'#8b5cf6',text:'AI detected: Expenses exceed 50% of income. Consider the 50/30/20 budgeting rule.'});
  if (net > 0) insights.push({icon:'??',color:'#06b6d4',text:`You have ${formatCurrency(net)} available. Consider investing for long-term growth.`});
  if (!insights.length) insights.push({icon:'??',color:'#6366f1',text:'Add transactions to unlock AI-powered spending insights and recommendations.'});
  return insights;
}

function MetricCard({ label, value, icon, color, glowColor, subtitle, index }) {
  return (
    <div className="dash-card" style={{
      background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))',
      border:`1px solid ${glowColor}40`, borderRadius:'16px', padding:'24px',
      boxShadow:`0 4px 24px ${glowColor}20`, position:'relative', overflow:'hidden',
      animation:`fadeInUp 0.5s ease ${index*0.1}s both`,
    }}>
      <div style={{position:'absolute',top:'-20px',right:'-20px',width:'100px',height:'100px',borderRadius:'50%',background:`radial-gradient(circle,${glowColor}30,transparent 70%)`,pointerEvents:'none'}} />
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:`linear-gradient(${glowColor}08 1px,transparent 1px),linear-gradient(90deg,${glowColor}08 1px,transparent 1px)`,backgroundSize:'20px 20px'}} />
      <div style={{position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
          <div style={{width:'44px',height:'44px',borderRadius:'12px',background:`linear-gradient(135deg,${glowColor}30,${glowColor}15)`,border:`1px solid ${glowColor}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>{icon}</div>
          <div style={{fontSize:'11px',fontWeight:'700',color:glowColor,textTransform:'uppercase',letterSpacing:'0.1em',background:`${glowColor}15`,padding:'3px 8px',borderRadius:'20px',border:`1px solid ${glowColor}30`}}>LIVE</div>
        </div>
        <div style={{fontSize:'12px',color:'rgba(165,180,252,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'6px'}}>{label}</div>
        <div style={{fontSize:'30px',fontWeight:'800',color,lineHeight:1.1,animation:'count-up 0.6s ease both',fontVariantNumeric:'tabular-nums'}}>{formatCurrency(value)}</div>
        {subtitle && <div style={{fontSize:'12px',color:'rgba(165,180,252,0.4)',marginTop:'6px'}}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Dashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [insights, setInsights] = useState([]);

  useEffect(() => { injectStyles(); }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/summary', { params });
      setSummary(res.data);
      setAiLoading(true);
      setTimeout(() => { setInsights(generateInsights(res.data)); setAiLoading(false); }, 900);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load summary.');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const netBalance = parseFloat(summary?.netBalance)||0;
  const income = parseFloat(summary?.totalIncome)||0;
  const expenses = parseFloat(summary?.totalExpenses)||0;
  const savingsRate = income > 0 ? ((income-expenses)/income*100) : 0;

  return (
    <div style={{minHeight:'100vh',backgroundColor:'transparent',fontFamily:"'Inter',system-ui,sans-serif",padding:'32px 28px',boxSizing:'border-box',position:'relative',overflow:'hidden'}}>
      <div style={{display:'none'}} />
      <div style={{display:'none'}} />
      <div style={{position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'32px',flexWrap:'wrap',gap:'16px'}}>
          <div>
            <div style={{fontSize:'12px',color:'rgba(99,102,241,0.8)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:'6px',fontWeight:'600'}}>NEXUS FINANCE AI</div>
            <h1 style={{margin:0,fontSize:'32px',fontWeight:'800',color:'#e2e8f0',letterSpacing:'-0.02em'}}>Financial Dashboard</h1>
            <p style={{margin:'6px 0 0',fontSize:'14px',color:'rgba(165,180,252,0.5)'}}>Real-time overview of your financial health</p>
          </div>
          <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap',background:'rgba(15,23,42,0.8)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'12px',padding:'12px 16px'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
              <label style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.1em'}}>From</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{padding:'6px 10px',fontSize:'13px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'7px',outline:'none',color:'#a5b4fc'}} />
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
              <label style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.1em'}}>To</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{padding:'6px 10px',fontSize:'13px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'7px',outline:'none',color:'#a5b4fc'}} />
            </div>
          </div>
        </div>

        {loading && (
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'200px'}}>
            <div style={{textAlign:'center'}}>
              <div style={{width:'48px',height:'48px',border:'3px solid rgba(99,102,241,0.2)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}} />
              <div style={{color:'rgba(165,180,252,0.5)',fontSize:'14px'}}>Syncing financial data...</div>
            </div>
          </div>
        )}
        {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',padding:'14px 18px',marginBottom:'24px',color:'#fca5a5',fontSize:'14px'}}>Warning: {error}</div>}

        {!loading && !error && summary && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'20px',marginBottom:'28px'}}>
              <MetricCard label="Total Income" value={summary.totalIncome} icon="??" color="#10b981" glowColor="#10b981" subtitle="All income sources" index={0} />
              <MetricCard label="Total Expenses" value={summary.totalExpenses} icon="??" color="#ef4444" glowColor="#ef4444" subtitle="All spending" index={1} />
              <MetricCard label="Net Balance" value={summary.netBalance} icon="?" color={netBalance>=0?'#a5b4fc':'#f87171'} glowColor={netBalance>=0?'#6366f1':'#ef4444'} subtitle={netBalance>=0?'Positive cash flow':'Negative cash flow'} index={2} />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'20px',marginBottom:'28px'}}>
              <div style={{background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'16px',padding:'24px',animation:'fadeInUp 0.5s ease 0.3s both'}}>
                <div style={{fontSize:'12px',color:'rgba(165,180,252,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'16px',fontWeight:'600'}}>Savings Rate Analysis</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'8px',marginBottom:'16px'}}>
                  <span style={{fontSize:'40px',fontWeight:'800',color:savingsRate>=20?'#10b981':savingsRate>=0?'#f59e0b':'#ef4444'}}>{savingsRate.toFixed(1)}%</span>
                  <span style={{fontSize:'13px',color:'rgba(165,180,252,0.4)'}}>of income saved</span>
                </div>
                <div style={{background:'rgba(99,102,241,0.1)',borderRadius:'8px',height:'8px',overflow:'hidden',marginBottom:'10px'}}>
                  <div style={{height:'100%',borderRadius:'8px',width:`${Math.min(Math.max(savingsRate,0),100)}%`,background:savingsRate>=20?'linear-gradient(90deg,#10b981,#34d399)':'linear-gradient(90deg,#f59e0b,#fbbf24)',transition:'width 1s ease'}} />
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'rgba(165,180,252,0.3)'}}>
                  <span>0%</span><span>Target: 20%</span><span>100%</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'16px'}}>
                  <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.12)',borderRadius:'8px',padding:'10px'}}>
                    <div style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Income</div>
                    <div style={{fontSize:'15px',fontWeight:'700',color:'#10b981',marginTop:'3px'}}>{formatCurrency(income)}</div>
                  </div>
                  <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.12)',borderRadius:'8px',padding:'10px'}}>
                    <div style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Expenses</div>
                    <div style={{fontSize:'15px',fontWeight:'700',color:'#ef4444',marginTop:'3px'}}>{formatCurrency(expenses)}</div>
                  </div>
                </div>
              </div>

              <div style={{background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))',border:'1px solid rgba(139,92,246,0.25)',borderRadius:'16px',padding:'24px',animation:'fadeInUp 0.5s ease 0.4s both'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'linear-gradient(135deg,#8b5cf6,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',boxShadow:'0 0 12px rgba(139,92,246,0.4)'}}>AI</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'#c4b5fd'}}>AI Financial Advisor</div>
                    <div style={{fontSize:'10px',color:'rgba(165,180,252,0.4)'}}>Powered by NexusAI</div>
                  </div>
                  <div style={{marginLeft:'auto',fontSize:'10px',color:'#10b981',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',padding:'2px 8px',borderRadius:'20px',fontWeight:'600'}}>ACTIVE</div>
                </div>
                {aiLoading ? (
                  <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'16px',background:'rgba(139,92,246,0.08)',borderRadius:'10px'}}>
                    <div style={{width:'20px',height:'20px',border:'2px solid rgba(139,92,246,0.3)',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0}} />
                    <span style={{fontSize:'13px',color:'rgba(165,180,252,0.6)'}}>Analyzing your financial patterns...</span>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {insights.map((ins,i)=>(
                      <div key={i} className="ai-insight" style={{display:'flex',gap:'10px',padding:'12px',background:'rgba(99,102,241,0.06)',border:`1px solid ${ins.color}20`,borderRadius:'10px',borderLeft:`3px solid ${ins.color}`,animation:`fadeInUp 0.4s ease ${i*0.1}s both`}}>
                        <span style={{fontSize:'16px',flexShrink:0}}>{ins.icon}</span>
                        <span style={{fontSize:'12px',color:'rgba(226,232,240,0.8)',lineHeight:1.5}}>{ins.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'16px',padding:'24px',animation:'fadeInUp 0.5s ease 0.5s both'}}>
              <div style={{fontSize:'12px',color:'rgba(165,180,252,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'16px',fontWeight:'600'}}>Quick Actions</div>
              <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
                {[{label:'Add Transaction',icon:'+',href:'/transactions',color:'#6366f1'},{label:'View Reports',icon:'*',href:'/reports',color:'#8b5cf6'},{label:'Manage Categories',icon:'#',href:'/categories',color:'#06b6d4'}].map(a=>(
                  <a key={a.label} href={a.href} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',borderRadius:'10px',textDecoration:'none',background:`${a.color}15`,border:`1px solid ${a.color}30`,color:a.color,fontSize:'13px',fontWeight:'600',transition:'all 0.2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${a.color}25`;e.currentTarget.style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${a.color}15`;e.currentTarget.style.transform='translateY(0)';}}>
                    <span>{a.icon}</span>{a.label}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

