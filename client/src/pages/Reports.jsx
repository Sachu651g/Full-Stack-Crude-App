// Reports.jsx — Futuristic animated analytics dashboard
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
} from 'recharts';
import apiClient from '../api/client.js';

// ── Inject global styles ──────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('kiro-reports-styles')) return;
  const s = document.createElement('style');
  s.id = 'kiro-reports-styles';
  s.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeInUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes glow-pulse { 0%,100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(139,92,246,0.2); } }
    @keyframes border-glow { 0%,100% { border-color: rgba(99,102,241,0.25); } 50% { border-color: rgba(139,92,246,0.55); } }
    @keyframes scan-h { 0% { top: 0%; } 100% { top: 100%; } }
    @keyframes number-pop { 0% { opacity:0; transform:scale(0.7); } 60% { transform:scale(1.08); } 100% { opacity:1; transform:scale(1); } }
    .r-card {
      background: linear-gradient(135deg, rgba(8,12,28,0.97) 0%, rgba(12,18,38,0.95) 100%);
      border: 1px solid rgba(99,102,241,0.22);
      border-radius: 18px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      animation: glow-pulse 6s ease-in-out infinite, border-glow 6s ease-in-out infinite;
    }
    .r-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(99,102,241,0.04) 0%, transparent 60%);
      pointer-events: none;
    }
    .r-card::after {
      content: '';
      position: absolute;
      left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent);
      animation: scan-h 4s linear infinite;
      pointer-events: none;
    }
    .r-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(99,102,241,0.3) !important; }
    .recharts-surface { background: transparent !important; }
    .recharts-wrapper { background: transparent !important; }
    .recharts-cartesian-grid-horizontal line,
    .recharts-cartesian-grid-vertical line { stroke: rgba(99,102,241,0.12) !important; }
    .recharts-legend-item-text { color: rgba(165,180,252,0.7) !important; font-size: 12px !important; }
    .recharts-default-legend { background: transparent !important; }
    .recharts-tooltip-wrapper { z-index: 999 !important; }
    .kpi-num { animation: number-pop 0.7s cubic-bezier(.22,1,.36,1) both; }
  `;
  document.head.appendChild(s);
}

// ── Constants ─────────────────────────────────────────────────────────────
const NEON = ['#818cf8','#a78bfa','#22d3ee','#34d399','#fb923c','#f472b6','#facc15','#60a5fa','#e879f9','#4ade80'];

function fmt(v) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:0}).format(parseFloat(v)||0);
}

// ── Custom dark tooltip ───────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(5,8,22,0.98),rgba(10,14,32,0.98))',
      border: '1px solid rgba(99,102,241,0.5)',
      borderRadius: '12px', padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.2)',
      backdropFilter: 'blur(12px)',
      minWidth: '140px',
    }}>
      {label && <div style={{fontSize:'11px',color:'rgba(165,180,252,0.5)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.1em'}}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom: i < payload.length-1 ? '5px' : 0}}>
          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:p.color,boxShadow:`0 0 6px ${p.color}`,flexShrink:0}} />
          <span style={{fontSize:'12px',color:'rgba(165,180,252,0.7)'}}>{p.name}:</span>
          <span style={{fontSize:'13px',fontWeight:'700',color:'#e2e8f0',marginLeft:'auto',paddingLeft:'8px'}}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieDarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(5,8,22,0.98),rgba(10,14,32,0.98))',
      border: `1px solid ${p.payload.fill}80`,
      borderRadius: '12px', padding: '12px 16px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${p.payload.fill}40`,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
        <div style={{width:'10px',height:'10px',borderRadius:'50%',background:p.payload.fill,boxShadow:`0 0 8px ${p.payload.fill}`}} />
        <span style={{fontSize:'13px',fontWeight:'700',color:'#e2e8f0'}}>{p.name}</span>
      </div>
      <div style={{fontSize:'20px',fontWeight:'800',color:p.payload.fill,textShadow:`0 0 12px ${p.payload.fill}`}}>{fmt(p.value)}</div>
      <div style={{fontSize:'11px',color:'rgba(165,180,252,0.5)',marginTop:'3px'}}>{(p.percent*100).toFixed(1)}% of total</div>
    </div>
  );
}

// ── Custom pie label ──────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
      {`${(percent*100).toFixed(0)}%`}
    </text>
  );
}

// ── Chart card wrapper ────────────────────────────────────────────────────
function Card({ title, subtitle, children, span = 1, index = 0 }) {
  return (
    <div className="r-card" style={{
      gridColumn: span === 2 ? 'span 2' : 'span 1',
      animation: `fadeInUp 0.5s ease ${index * 0.09}s both`,
    }}>
      <div style={{marginBottom:'16px',position:'relative',zIndex:1}}>
        <div style={{fontSize:'14px',fontWeight:'700',color:'#c4b5fd',letterSpacing:'0.02em'}}>{title}</div>
        {subtitle && <div style={{fontSize:'11px',color:'rgba(165,180,252,0.35)',marginTop:'2px'}}>{subtitle}</div>}
      </div>
      <div style={{position:'relative',zIndex:1}}>{children}</div>
    </div>
  );
}

function Empty() {
  return (
    <div style={{height:'220px',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'10px'}}>
      <div style={{fontSize:'36px',opacity:0.2,filter:'grayscale(1)'}}>📊</div>
      <div style={{fontSize:'13px',color:'rgba(165,180,252,0.25)'}}>No data yet — add transactions to see charts</div>
    </div>
  );
}

// ── Axis tick styles ──────────────────────────────────────────────────────
const tickStyle = { fill: 'rgba(165,180,252,0.45)', fontSize: 11 };
const gridStyle = { stroke: 'rgba(99,102,241,0.1)' };

// ── Main component ────────────────────────────────────────────────────────
export default function Reports() {
  const today = new Date();
  const [startDate, setStartDate] = useState(`${today.getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0,10));
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { injectStyles(); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p = {};
      if (startDate) p.startDate = startDate;
      if (endDate) p.endDate = endDate;
      const [catRes, monthRes, sumRes] = await Promise.all([
        apiClient.get('/reports/by-category', { params: p }),
        apiClient.get('/reports/by-month', { params: p }),
        apiClient.get('/summary', { params: p }),
      ]);
      setByCategory(Array.isArray(catRes.data) ? catRes.data : []);
      setByMonth(Array.isArray(monthRes.data) ? monthRes.data : []);
      setSummary(sumRes.data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load data.');
    } finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ────────────────────────────────────────────────────────
  const expCat = byCategory.map((d,i) => ({
    name: d.categoryName || d.name || 'Unknown',
    value: parseFloat(d.total || 0),
    fill: NEON[i % NEON.length],
  })).filter(d => d.value > 0);

  const monthly = byMonth.map(d => ({
    month: (d.month || '').slice(0,7),
    income: parseFloat(d.totalIncome || 0),
    expenses: parseFloat(d.totalExpenses || 0),
    net: parseFloat(d.totalIncome || 0) - parseFloat(d.totalExpenses || 0),
  }));

  const totalIncome   = parseFloat(summary?.totalIncome   || 0);
  const totalExpenses = parseFloat(summary?.totalExpenses || 0);
  const netBalance    = parseFloat(summary?.netBalance    || 0);
  const savingsRate   = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

  const donutData = [
    { name: 'Income',   value: totalIncome,   fill: '#34d399' },
    { name: 'Expenses', value: totalExpenses, fill: '#f87171' },
  ].filter(d => d.value > 0);

  const radarData = expCat.slice(0,8).map(d => ({
    cat: d.name.length > 9 ? d.name.slice(0,9)+'…' : d.name,
    value: d.value,
  }));

  const inputStyle = {
    padding:'7px 12px', fontSize:'13px',
    background:'rgba(99,102,241,0.08)',
    border:'1px solid rgba(99,102,241,0.3)',
    borderRadius:'8px', color:'#a5b4fc', outline:'none',
  };

  const kpis = [
    { label:'Total Income',   value:fmt(totalIncome),   color:'#34d399', glow:'rgba(52,211,153,0.3)',  bg:'rgba(52,211,153,0.07)',  border:'rgba(52,211,153,0.2)'  },
    { label:'Total Expenses', value:fmt(totalExpenses), color:'#f87171', glow:'rgba(248,113,113,0.3)', bg:'rgba(248,113,113,0.07)', border:'rgba(248,113,113,0.2)' },
    { label:'Net Balance',    value:fmt(netBalance),    color: netBalance>=0?'#818cf8':'#f87171', glow:'rgba(129,140,248,0.3)', bg:'rgba(99,102,241,0.07)', border:'rgba(99,102,241,0.2)' },
    { label:'Savings Rate',   value:`${savingsRate.toFixed(1)}%`, color: savingsRate>=20?'#34d399':'#fb923c', glow:'rgba(251,146,60,0.3)', bg:'rgba(251,146,60,0.07)', border:'rgba(251,146,60,0.2)' },
  ];

  return (
    <div style={{minHeight:'100vh',backgroundColor:'transparent',fontFamily:"'Inter',system-ui,sans-serif",padding:'28px 24px',boxSizing:'border-box'}}>
      <div style={{position:'relative',zIndex:1}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'14px'}}>
          <div>
            <div style={{fontSize:'11px',color:'rgba(99,102,241,0.8)',textTransform:'uppercase',letterSpacing:'0.18em',marginBottom:'5px',fontWeight:'700'}}>NEXUS FINANCE AI</div>
            <h1 style={{margin:0,fontSize:'30px',fontWeight:'800',color:'#e2e8f0',letterSpacing:'-0.02em',background:'linear-gradient(135deg,#e2e8f0,#a5b4fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Analytics</h1>
            <p style={{margin:'4px 0 0',fontSize:'13px',color:'rgba(165,180,252,0.4)'}}>Futuristic financial intelligence dashboard</p>
          </div>
          <div style={{display:'flex',gap:'10px',alignItems:'flex-end',background:'rgba(8,12,28,0.9)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'12px',padding:'12px 14px',flexWrap:'wrap',backdropFilter:'blur(12px)'}}>
            {[['From',startDate,setStartDate],['To',endDate,setEndDate]].map(([lbl,val,set])=>(
              <div key={lbl} style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                <label style={{fontSize:'10px',color:'rgba(165,180,252,0.35)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{lbl}</label>
                <input type="date" value={val} onChange={e=>set(e.target.value)} style={inputStyle} />
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',padding:'12px 16px',marginBottom:'20px',color:'#fca5a5',fontSize:'14px'}}>{error}</div>}

        {loading ? (
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'300px',flexDirection:'column',gap:'16px'}}>
            <div style={{width:'52px',height:'52px',border:'3px solid rgba(99,102,241,0.15)',borderTopColor:'#818cf8',borderRightColor:'#a78bfa',borderRadius:'50%',animation:'spin 0.7s linear infinite',boxShadow:'0 0 20px rgba(99,102,241,0.3)'}} />
            <div style={{fontSize:'13px',color:'rgba(165,180,252,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>Loading analytics...</div>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:'14px',marginBottom:'20px'}}>
              {kpis.map((k,i)=>(
                <div key={k.label} className="r-card" style={{
                  background:`linear-gradient(135deg,${k.bg},rgba(8,12,28,0.97))`,
                  border:`1px solid ${k.border}`,
                  animation:`fadeInUp 0.45s ease ${i*0.07}s both`,
                  boxShadow:`0 4px 24px ${k.glow}`,
                  padding:'18px 20px',
                }}>
                  <div style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:'8px'}}>{k.label}</div>
                  <div className="kpi-num" style={{fontSize:'28px',fontWeight:'800',color:k.color,textShadow:`0 0 16px ${k.glow}`,lineHeight:1}}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Charts grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>

              {/* 1 — Expense Pie */}
              <Card title="Expenses by Category" subtitle="Pie breakdown" index={0}>
                {expCat.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <PieChart>
                      <defs>
                        {expCat.map((d,i)=>(
                          <filter key={i} id={`glow-pie-${i}`}>
                            <feGaussianBlur stdDeviation="3" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                          </filter>
                        ))}
                      </defs>
                      <Pie data={expCat} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                        labelLine={false} label={PieLabel} strokeWidth={2} stroke="rgba(8,12,28,0.8)">
                        {expCat.map((d,i)=>(
                          <Cell key={i} fill={d.fill} style={{filter:`drop-shadow(0 0 6px ${d.fill})`}} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieDarkTooltip />} />
                      <Legend
                        formatter={(v,e)=><span style={{color:e.color,fontSize:'12px',fontWeight:'600',textShadow:`0 0 8px ${e.color}`}}>{v}</span>}
                        wrapperStyle={{paddingTop:'8px'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* 2 — Income vs Expenses Donut */}
              <Card title="Income vs Expenses" subtitle="Donut overview" index={1}>
                {donutData.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={105}
                        dataKey="value" paddingAngle={5} strokeWidth={2} stroke="rgba(8,12,28,0.8)">
                        {donutData.map((d,i)=>(
                          <Cell key={i} fill={d.fill} style={{filter:`drop-shadow(0 0 8px ${d.fill})`}} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieDarkTooltip />} />
                      <Legend
                        formatter={(v,e)=><span style={{color:e.color,fontSize:'12px',fontWeight:'600',textShadow:`0 0 8px ${e.color}`}}>{v}</span>}
                        wrapperStyle={{paddingTop:'8px'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* 3 — Monthly Bar */}
              <Card title="Monthly Income vs Expenses" subtitle="Grouped bar chart" span={2} index={2}>
                {monthly.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthly} margin={{top:5,right:20,left:10,bottom:5}} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                      <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>fmt(v)} />
                      <Tooltip content={<DarkTooltip />} cursor={{fill:'rgba(99,102,241,0.06)'}} />
                      <Legend formatter={v=><span style={{color:'rgba(165,180,252,0.6)',fontSize:'12px'}}>{v}</span>} />
                      <Bar dataKey="income" name="Income" fill="#34d399" radius={[5,5,0,0]}
                        style={{filter:'drop-shadow(0 0 6px rgba(52,211,153,0.5))'}} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[5,5,0,0]}
                        style={{filter:'drop-shadow(0 0 6px rgba(248,113,113,0.5))'}} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* 4 — Area Chart */}
              <Card title="Income & Expense Flow" subtitle="Area chart over time" span={2} index={3}>
                {monthly.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={monthly} margin={{top:5,right:20,left:10,bottom:5}}>
                      <defs>
                        <linearGradient id="aIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="aExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f87171" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="aNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                      <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>fmt(v)} />
                      <Tooltip content={<DarkTooltip />} cursor={{stroke:'rgba(99,102,241,0.3)',strokeWidth:1}} />
                      <Legend formatter={v=><span style={{color:'rgba(165,180,252,0.6)',fontSize:'12px'}}>{v}</span>} />
                      <Area type="monotone" dataKey="income" name="Income" stroke="#34d399" strokeWidth={2.5} fill="url(#aIncome)" dot={{fill:'#34d399',r:4,strokeWidth:0}} />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2.5} fill="url(#aExpense)" dot={{fill:'#f87171',r:4,strokeWidth:0}} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* 5 — Net Balance Line */}
              <Card title="Net Balance Trend" subtitle="Monthly net over time" span={2} index={4}>
                {monthly.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={monthly} margin={{top:5,right:20,left:10,bottom:5}}>
                      <defs>
                        <linearGradient id="netGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#818cf8"/>
                          <stop offset="100%" stopColor="#a78bfa"/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                      <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>fmt(v)} />
                      <Tooltip content={<DarkTooltip />} cursor={{stroke:'rgba(99,102,241,0.3)',strokeWidth:1}} />
                      <Legend formatter={v=><span style={{color:'rgba(165,180,252,0.6)',fontSize:'12px'}}>{v}</span>} />
                      <Line type="monotone" dataKey="net" name="Net Balance" stroke="url(#netGrad)" strokeWidth={3}
                        dot={{fill:'#818cf8',r:5,strokeWidth:2,stroke:'rgba(8,12,28,0.8)'}}
                        activeDot={{r:7,fill:'#a78bfa',stroke:'rgba(8,12,28,0.8)',strokeWidth:2,style:{filter:'drop-shadow(0 0 8px #a78bfa)'}}} />
                      <Line type="monotone" dataKey="income" name="Income" stroke="#34d399" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* 6 — Horizontal Bar */}
              <Card title="Expense by Category" subtitle="Horizontal bar chart" span={2} index={5}>
                {expCat.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={Math.max(200, expCat.length*48)}>
                    <BarChart data={expCat} layout="vertical" margin={{top:5,right:30,left:90,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" {...gridStyle} horizontal={false} />
                      <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>fmt(v)} />
                      <YAxis type="category" dataKey="name" tick={{fill:'rgba(165,180,252,0.6)',fontSize:12}} width={85} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkTooltip />} cursor={{fill:'rgba(99,102,241,0.06)'}} />
                      <Bar dataKey="value" name="Amount" radius={[0,6,6,0]}>
                        {expCat.map((d,i)=>(
                          <Cell key={i} fill={d.fill} style={{filter:`drop-shadow(0 0 5px ${d.fill}80)`}} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* 7 — Radar */}
              <Card title="Spending Radar" subtitle="Category pattern" index={6}>
                {radarData.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <RadarChart data={radarData}>
                      <defs>
                        <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5}/>
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <PolarGrid stroke="rgba(99,102,241,0.18)" />
                      <PolarAngleAxis dataKey="cat" tick={{fill:'rgba(165,180,252,0.55)',fontSize:11}} />
                      <PolarRadiusAxis tick={{fill:'rgba(165,180,252,0.25)',fontSize:9}} tickFormatter={v=>fmt(v)} />
                      <Radar name="Spending" dataKey="value" stroke="#a78bfa" strokeWidth={2}
                        fill="url(#radarFill)" style={{filter:'drop-shadow(0 0 8px rgba(167,139,250,0.4))'}} />
                      <Tooltip content={<DarkTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* 8 — Composed */}
              <Card title="Income, Expenses & Net" subtitle="Composed bar + line" index={7}>
                {monthly.length===0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={270}>
                    <ComposedChart data={monthly} margin={{top:5,right:20,left:10,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
                      <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>fmt(v)} />
                      <Tooltip content={<DarkTooltip />} cursor={{fill:'rgba(99,102,241,0.05)'}} />
                      <Legend formatter={v=><span style={{color:'rgba(165,180,252,0.6)',fontSize:'11px'}}>{v}</span>} />
                      <Bar dataKey="income" name="Income" fill="rgba(52,211,153,0.45)" radius={[4,4,0,0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="rgba(248,113,113,0.45)" radius={[4,4,0,0]} />
                      <Line type="monotone" dataKey="net" name="Net" stroke="#818cf8" strokeWidth={2.5}
                        dot={{fill:'#818cf8',r:4,strokeWidth:0}}
                        activeDot={{r:6,fill:'#a78bfa',style:{filter:'drop-shadow(0 0 6px #a78bfa)'}}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </Card>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
