// Reports.jsx — Futuristic AI analytics page with recommendations and future insights
import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import apiClient from '../api/client.js';

function injectStyles() {
  if (document.getElementById('kiro-rep-styles')) return;
  const s = document.createElement('style');
  s.id = 'kiro-rep-styles';
  s.textContent = `
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes gridMove { 0%{transform:translateY(0)} 100%{transform:translateY(60px)} }
    @keyframes orb-float { 0%,100%{transform:translate(0,0)} 50%{transform:translate(25px,-18px)} }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
    @keyframes typewriter { from{width:0} to{width:100%} }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    .rep-card:hover { transform:translateY(-3px) !important; box-shadow:0 12px 40px rgba(99,102,241,0.25) !important; }
    .rep-card { transition:all 0.25s ease; }
    .insight-row:hover { background:rgba(99,102,241,0.1) !important; }
    .insight-row { transition:background 0.2s; }
    input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.6) sepia(1) saturate(3) hue-rotate(200deg); cursor:pointer; }
  `;
  document.head.appendChild(s);
}

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316','#a855f7'];

function fmt(v) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:0}).format(parseFloat(v)||0);
}

// AI engine: generate recommendations from real data
function generateRecommendations(categoryData, monthData, summary) {
  const recs = [];
  const income = parseFloat(summary?.totalIncome)||0;
  const expenses = parseFloat(summary?.totalExpenses)||0;

  if (categoryData.length > 0) {
    const top = [...categoryData].sort((a,b)=>b.value-a.value)[0];
    const pct = income > 0 ? ((top.value/income)*100).toFixed(1) : 0;
    recs.push({ icon:'🎯', color:'#f59e0b', title:'Top Spending Category', text:`"${top.name}" accounts for ${pct}% of your income (${fmt(top.value)}). Consider setting a monthly budget cap for this category.` });
  }

  if (monthData.length >= 2) {
    const last = monthData[monthData.length-1];
    const prev = monthData[monthData.length-2];
    const change = last.Expenses - prev.Expenses;
    if (change > 0) {
      recs.push({ icon:'📈', color:'#ef4444', title:'Spending Trend Alert', text:`Your expenses increased by ${fmt(change)} compared to last month. Review recent transactions to identify the cause.` });
    } else {
      recs.push({ icon:'📉', color:'#10b981', title:'Great Progress!', text:`You reduced spending by ${fmt(Math.abs(change))} vs last month. Keep this momentum going!` });
    }
  }

  if (income > 0 && expenses/income > 0.8) {
    recs.push({ icon:'⚠️', color:'#ef4444', title:'High Expense Ratio', text:`You are spending ${((expenses/income)*100).toFixed(0)}% of your income. Financial experts recommend keeping this below 70%.` });
  }

  if (income > expenses && income > 0) {
    const surplus = income - expenses;
    recs.push({ icon:'💰', color:'#10b981', title:'Investment Opportunity', text:`You have a surplus of ${fmt(surplus)}. Consider allocating 50% to an index fund and 50% to an emergency fund.` });
  }

  if (recs.length === 0) {
    recs.push({ icon:'📊', color:'#6366f1', title:'No Data Yet', text:'Add transactions to unlock personalized AI recommendations tailored to your spending patterns.' });
  }
  return recs;
}

// AI engine: generate future insights / projections
function generateFutureInsights(monthData, summary) {
  const insights = [];
  const income = parseFloat(summary?.totalIncome)||0;
  const expenses = parseFloat(summary?.totalExpenses)||0;

  if (monthData.length >= 2) {
    const avgExpenses = monthData.reduce((s,m)=>s+m.Expenses,0)/monthData.length;
    const projected3m = avgExpenses * 3;
    insights.push({ icon:'🔮', color:'#8b5cf6', title:'3-Month Expense Forecast', text:`Based on your average spending of ${fmt(avgExpenses)}/month, you will spend approximately ${fmt(projected3m)} over the next 3 months.` });

    const avgIncome = monthData.reduce((s,m)=>s+m.Income,0)/monthData.length;
    const projectedSavings = (avgIncome - avgExpenses) * 12;
    insights.push({ icon:'🚀', color:'#06b6d4', title:'Annual Savings Projection', text:`At your current rate, you could save ${fmt(projectedSavings)} over the next 12 months. ${projectedSavings > 0 ? 'Great trajectory!' : 'Consider reducing expenses to start saving.'}` });
  }

  if (income > 0) {
    const emergencyFund = expenses * 6;
    insights.push({ icon:'🛡️', color:'#10b981', title:'Emergency Fund Target', text:`Financial experts recommend 6 months of expenses as an emergency fund. Your target: ${fmt(emergencyFund)}. Start with small monthly contributions.` });
  }

  insights.push({ icon:'📅', color:'#f59e0b', title:'Year-End Projection', text:`If your current income/expense ratio holds, you will end the year with a net ${income > expenses ? 'surplus' : 'deficit'} of approximately ${fmt(Math.abs((income - expenses) * 12))}.` });

  return insights;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(10,15,30,0.97)',border:'1px solid rgba(99,102,241,0.35)',borderRadius:'10px',padding:'10px 14px',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
      {label && <div style={{fontSize:'11px',color:'rgba(165,180,252,0.5)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</div>}
      {payload.map((p,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'#e2e8f0',marginBottom:'2px'}}>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:p.color||p.fill,display:'inline-block',flexShrink:0}} />
          <span style={{color:'rgba(165,180,252,0.6)'}}>{p.name||p.dataKey}:</span>
          <span style={{fontWeight:'700'}}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function Reports() {
  const today = new Date().toISOString().slice(0,10);
  const firstOfYear = new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10);
  const [startDate, setStartDate] = useState(firstOfYear);
  const [endDate, setEndDate] = useState(today);
  const [categoryData, setCategoryData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [errorCat, setErrorCat] = useState('');
  const [errorMonth, setErrorMonth] = useState('');
  const [aiTab, setAiTab] = useState('recommendations');
  const [aiTyping, setAiTyping] = useState(false);

  useEffect(() => { injectStyles(); }, []);

  const fetchByCategory = useCallback(async () => {
    setLoadingCat(true); setErrorCat('');
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/reports/by-category', { params });
      const rows = Array.isArray(res.data)?res.data:(res.data.data??[]);
      setCategoryData(rows.map(r=>({name:r.category_name||r.name||'Unknown',value:parseFloat(r.total)||0})));
    } catch (err) { setErrorCat(err?.response?.data?.message||'Failed to load category report.'); }
    finally { setLoadingCat(false); }
  }, [startDate, endDate]);

  const fetchByMonth = useCallback(async () => {
    setLoadingMonth(true); setErrorMonth('');
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/reports/by-month', { params });
      const rows = Array.isArray(res.data)?res.data:(res.data.data??[]);
      setMonthData(rows.map(r=>({month:r.month,Income:parseFloat(r.income)||0,Expenses:parseFloat(r.expenses)||0})));
    } catch (err) { setErrorMonth(err?.response?.data?.message||'Failed to load monthly report.'); }
    finally { setLoadingMonth(false); }
  }, [startDate, endDate]);

  const fetchSummary = useCallback(async () => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get('/summary', { params });
      setSummary(res.data);
    } catch {}
  }, [startDate, endDate]);

  useEffect(() => {
    fetchByCategory();
    fetchByMonth();
    fetchSummary();
  }, [fetchByCategory, fetchByMonth, fetchSummary]);

  useEffect(() => {
    setAiTyping(true);
    const t = setTimeout(() => setAiTyping(false), 1200);
    return () => clearTimeout(t);
  }, [categoryData, monthData]);

  const totalSpending = categoryData.reduce((s,r)=>s+r.value,0);
  const recommendations = generateRecommendations(categoryData, monthData, summary);
  const futureInsights = generateFutureInsights(monthData, summary);

  const netTrend = monthData.map(m => ({ month: m.month, Net: m.Income - m.Expenses }));

  return (
    <div style={{minHeight:'100vh',backgroundColor:'transparent',fontFamily:"'Inter',system-ui,sans-serif",padding:'32px 28px',boxSizing:'border-box',position:'relative',overflow:'hidden'}}>
      {/* Animated grid */}
      <div style={{display:'none'}} />
      <div style={{position:'fixed',top:'15%',right:'8%',width:'350px',height:'350px',borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.07),transparent 70%)',pointerEvents:'none',zIndex:0,animation:'orb-float 10s ease-in-out infinite'}} />
      <div style={{position:'fixed',bottom:'10%',left:'20%',width:'280px',height:'280px',borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,0.05),transparent 70%)',pointerEvents:'none',zIndex:0,animation:'orb-float 14s ease-in-out infinite reverse'}} />

      <div style={{position:'relative',zIndex:1}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'28px',flexWrap:'wrap',gap:'16px'}}>
          <div>
            <div style={{fontSize:'12px',color:'rgba(99,102,241,0.8)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:'6px',fontWeight:'600'}}>
              <span style={{display:'inline-block',width:'6px',height:'6px',borderRadius:'50%',background:'#6366f1',marginRight:'6px',animation:'pulse-dot 2s infinite',verticalAlign:'middle'}} />
              NEXUS FINANCE AI
            </div>
            <h1 style={{margin:0,fontSize:'32px',fontWeight:'800',color:'#e2e8f0',letterSpacing:'-0.02em'}}>Analytics</h1>
            <p style={{margin:'6px 0 0',fontSize:'14px',color:'rgba(165,180,252,0.5)'}}>AI-powered financial intelligence and forecasting</p>
          </div>
          {/* Date filter */}
          <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap',background:'rgba(15,23,42,0.8)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'12px',padding:'12px 16px'}}>
            {[['From',startDate,setStartDate],['To',endDate,setEndDate]].map(([lbl,val,setter])=>(
              <div key={lbl} style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                <label style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{lbl}</label>
                <input type="date" value={val} onChange={e=>setter(e.target.value)} style={{padding:'6px 10px',fontSize:'13px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'7px',outline:'none',color:'#a5b4fc'}} />
              </div>
            ))}
          </div>
        </div>

        {/* Charts row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:'20px',marginBottom:'24px'}}>
          {/* Spending by category */}
          <div className="rep-card" style={{background:'linear-gradient(135deg,rgba(15,23,42,0.95),rgba(10,15,30,0.98))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'16px',padding:'24px',animation:'fadeInUp 0.4s ease both'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'11px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'4px',fontWeight:'700'}}>Spending by Category</div>
                {totalSpending > 0 && <div style={{fontSize:'22px',fontWeight:'800',color:'#e2e8f0'}}>{fmt(totalSpending)}</div>}
              </div>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🥧</div>
            </div>
            {errorCat && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',color:'#fca5a5',fontSize:'13px'}}>{errorCat}</div>}
            {loadingCat ? (
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'200px'}}>
                <div style={{width:'36px',height:'36px',border:'3px solid rgba(99,102,241,0.2)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
              </div>
            ) : categoryData.length === 0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'200px',color:'rgba(165,180,252,0.3)',fontSize:'14px',gap:'10px'}}>
                <span style={{fontSize:'40px'}}>📊</span>No expense data for this period.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={3}>
                      {categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} stroke="transparent" />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{marginTop:'14px',display:'flex',flexDirection:'column',gap:'5px'}}>
                  {categoryData.map((item,i)=>(
                    <div key={item.name} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',background:'rgba(99,102,241,0.05)',borderRadius:'8px',border:'1px solid rgba(99,102,241,0.08)'}}>
                      <span style={{width:'8px',height:'8px',borderRadius:'50%',background:COLORS[i%COLORS.length],flexShrink:0,boxShadow:`0 0 6px ${COLORS[i%COLORS.length]}80`}} />
                      <span style={{flex:1,fontSize:'12px',color:'rgba(226,232,240,0.8)'}}>{item.name}</span>
                      <span style={{fontSize:'12px',fontWeight:'700',color:'#e2e8f0'}}>{fmt(item.value)}</span>
                      <span style={{fontSize:'10px',color:'rgba(165,180,252,0.4)',minWidth:'36px',textAlign:'right'}}>{totalSpending>0?((item.value/totalSpending)*100).toFixed(1)+'%':''}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Income vs Expenses bar chart */}
          <div className="rep-card" style={{background:'linear-gradient(135deg,rgba(15,23,42,0.95),rgba(10,15,30,0.98))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'16px',padding:'24px',animation:'fadeInUp 0.4s ease 0.1s both'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <div style={{fontSize:'11px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:'700'}}>Income vs Expenses by Month</div>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>📊</div>
            </div>
            {errorMonth && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',color:'#fca5a5',fontSize:'13px'}}>{errorMonth}</div>}
            {loadingMonth ? (
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'200px'}}>
                <div style={{width:'36px',height:'36px',border:'3px solid rgba(99,102,241,0.2)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
              </div>
            ) : monthData.length === 0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'200px',color:'rgba(165,180,252,0.3)',fontSize:'14px',gap:'10px'}}>
                <span style={{fontSize:'40px'}}>📈</span>No data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthData} margin={{top:5,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'rgba(165,180,252,0.5)'}} axisLine={{stroke:'rgba(99,102,241,0.15)'}} tickLine={false} />
                  <YAxis tickFormatter={v=>'$'+v} tick={{fontSize:10,fill:'rgba(165,180,252,0.5)'}} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill:'rgba(99,102,241,0.06)'}} />
                  <Legend wrapperStyle={{fontSize:'11px',color:'rgba(165,180,252,0.6)'}} />
                  <Bar dataKey="Income" fill="#10b981" radius={[5,5,0,0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Net balance trend line chart */}
        {netTrend.length > 1 && (
          <div className="rep-card" style={{background:'linear-gradient(135deg,rgba(15,23,42,0.95),rgba(10,15,30,0.98))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'16px',padding:'24px',marginBottom:'24px',animation:'fadeInUp 0.4s ease 0.2s both'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <div style={{fontSize:'11px',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:'700'}}>Net Balance Trend</div>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>📉</div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={netTrend} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                <XAxis dataKey="month" tick={{fontSize:10,fill:'rgba(165,180,252,0.5)'}} axisLine={{stroke:'rgba(99,102,241,0.15)'}} tickLine={false} />
                <YAxis tickFormatter={v=>'$'+v} tick={{fontSize:10,fill:'rgba(165,180,252,0.5)'}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Net" stroke="#6366f1" strokeWidth={2.5} dot={{fill:'#6366f1',r:4,strokeWidth:0}} activeDot={{r:6,fill:'#a5b4fc'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Panel — Recommendations + Future Insights */}
        <div className="rep-card" style={{background:'linear-gradient(135deg,rgba(15,23,42,0.95),rgba(10,15,30,0.98))',border:'1px solid rgba(139,92,246,0.3)',borderRadius:'16px',padding:'24px',animation:'fadeInUp 0.4s ease 0.3s both'}}>
          {/* Panel header */}
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px',flexWrap:'wrap'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'10px',background:'linear-gradient(135deg,#8b5cf6,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',boxShadow:'0 0 16px rgba(139,92,246,0.5)'}}>AI</div>
            <div>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#c4b5fd'}}>NexusAI Financial Intelligence</div>
              <div style={{fontSize:'10px',color:'rgba(165,180,252,0.4)'}}>Powered by rule-based ML engine</div>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
              {[['recommendations','Recommendations'],['insights','Future Insights']].map(([key,label])=>(
                <button key={key} onClick={()=>setAiTab(key)} style={{padding:'6px 14px',fontSize:'12px',fontWeight:'600',borderRadius:'8px',border:'none',cursor:'pointer',transition:'all 0.2s',background:aiTab===key?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(99,102,241,0.1)',color:aiTab===key?'#fff':'rgba(165,180,252,0.6)',boxShadow:aiTab===key?'0 0 12px rgba(99,102,241,0.4)':'none'}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {aiTyping ? (
            <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'20px',background:'rgba(139,92,246,0.08)',borderRadius:'12px'}}>
              <div style={{width:'22px',height:'22px',border:'2px solid rgba(139,92,246,0.3)',borderTopColor:'#8b5cf6',borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0}} />
              <span style={{fontSize:'13px',color:'rgba(165,180,252,0.6)'}}>NexusAI is analyzing your financial data...</span>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {(aiTab === 'recommendations' ? recommendations : futureInsights).map((item,i)=>(
                <div key={i} className="insight-row" style={{display:'flex',gap:'14px',padding:'14px 16px',background:'rgba(99,102,241,0.05)',border:`1px solid ${item.color}18`,borderRadius:'12px',borderLeft:`3px solid ${item.color}`,animation:`fadeInUp 0.4s ease ${i*0.08}s both`,cursor:'default'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'10px',background:`${item.color}18`,border:`1px solid ${item.color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>{item.icon}</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:item.color,marginBottom:'4px'}}>{item.title}</div>
                    <div style={{fontSize:'13px',color:'rgba(226,232,240,0.75)',lineHeight:1.6}}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;

