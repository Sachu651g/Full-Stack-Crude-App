// Transactions.jsx — Futuristic transactions page
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';

function injectStyles() {
  if (document.getElementById('kiro-tx-styles')) return;
  const s = document.createElement('style');
  s.id = 'kiro-tx-styles';
  s.textContent = `
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
    .tx-row:hover { background:rgba(99,102,241,0.06) !important; }
    .tx-row { transition:background 0.15s; }
    input:focus, select:focus { border-color:rgba(99,102,241,0.6) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.15) !important; outline:none !important; }
  `;
  document.head.appendChild(s);
}

function formatCurrency(v) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(parseFloat(v)||0);
}
function fixEncoding(str) {
  if (!str) return str;
  // Fix common mojibake: â€" → —, â€™ → ', etc.
  try {
    return str
      .replace(/â€"/g, '\u2014')
      .replace(/â€™/g, '\u2019')
      .replace(/â€œ/g, '\u201C')
      .replace(/â€/g, '\u201D')
      .replace(/Ã©/g, '\u00E9')
      .replace(/Ã /g, '\u00E0');
  } catch { return str; }
}

function formatDate(s) { return s ? s.slice(0,10) : '-'; }

const EMPTY_FORM = { amount:'', type:'expense', category_id:'', date:'', description:'' };

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(2,8,23,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'16px',backdropFilter:'blur(4px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(135deg,#0a0f1e,#050b18)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:'20px',padding:'28px',width:'100%',maxWidth:'480px',boxSizing:'border-box',boxShadow:'0 24px 80px rgba(0,0,0,0.6)',animation:'slideIn 0.2s ease both'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <h2 style={{margin:0,fontSize:'20px',fontWeight:'800',color:'#e2e8f0'}}>{title}</h2>
          <button onClick={onClose} style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'8px',color:'rgba(165,180,252,0.6)',cursor:'pointer',padding:'4px 10px',fontSize:'16px'}}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function inputStyle(extra) {
  return {padding:'10px 14px',fontSize:'14px',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'10px',color:'#e2e8f0',width:'100%',boxSizing:'border-box',...extra};
}

function TransactionForm({ initialData, categories, onSave, onClose }) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState(() => isEdit ? {
    amount:String(initialData.amount??''), type:initialData.type??'expense',
    category_id:String(initialData.category_id??''), date:(initialData.date??'').slice(0,10),
    description:initialData.description??'',
  } : {...EMPTY_FORM});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  function handleChange(e) { setForm(p=>({...p,[e.target.name]:e.target.value})); }

  async function handleSubmit(e) {
    e.preventDefault(); setFormError('');
    if (!form.amount||isNaN(Number(form.amount))||Number(form.amount)<=0) { setFormError('Amount must be a positive number.'); return; }
    if (!form.category_id) { setFormError('Please select a category.'); return; }
    if (!form.date) { setFormError('Please select a date.'); return; }
    setSubmitting(true);
    try {
      const payload = { amount:parseFloat(form.amount), type:form.type, category_id:parseInt(form.category_id,10), date:form.date, description:form.description||null };
      const res = isEdit ? await apiClient.patch('/transactions/'+initialData.id, payload) : await apiClient.post('/transactions', payload);
      onSave(res.data);
    } catch (err) { setFormError(err?.response?.data?.message||'Failed to save transaction.'); }
    finally { setSubmitting(false); }
  }

  const labelStyle = { fontSize:'12px', fontWeight:'600', color:'rgba(165,180,252,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'5px', display:'block' };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
        <div>
          <label style={labelStyle}>Amount *</label>
          <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={handleChange} placeholder="0.00" style={inputStyle()} required />
        </div>
        <div>
          <label style={labelStyle}>Type *</label>
          <select name="type" value={form.type} onChange={handleChange} style={inputStyle({cursor:'pointer'})}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      </div>
      <div style={{marginBottom:'14px'}}>
        <label style={labelStyle}>Category *</label>
        <select name="category_id" value={form.category_id} onChange={handleChange} style={inputStyle({cursor:'pointer'})} required>
          <option value="">Select a category...</option>
          {categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
      </div>
      <div style={{marginBottom:'14px'}}>
        <label style={labelStyle}>Date *</label>
        <input name="date" type="date" value={form.date} onChange={handleChange} style={inputStyle()} required />
      </div>
      <div style={{marginBottom:'20px'}}>
        <label style={labelStyle}>Description</label>
        <input name="description" type="text" value={form.description} onChange={handleChange} placeholder="Optional note..." style={inputStyle()} />
      </div>
      {formError && <p style={{fontSize:'13px',color:'#f87171',marginBottom:'14px',background:'rgba(239,68,68,0.1)',padding:'10px 14px',borderRadius:'8px'}}>{formError}</p>}
      <div style={{display:'flex',justifyContent:'flex-end',gap:'10px'}}>
        <button type="button" onClick={onClose} style={{padding:'10px 20px',fontSize:'14px',color:'rgba(165,180,252,0.6)',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'10px',cursor:'pointer'}}>Cancel</button>
        <button type="submit" disabled={submitting} style={{padding:'10px 24px',fontSize:'14px',fontWeight:'700',color:'#fff',background:submitting?'rgba(99,102,241,0.4)':'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:'10px',cursor:submitting?'not-allowed':'pointer',boxShadow:submitting?'none':'0 0 20px rgba(99,102,241,0.4)'}}>
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
}

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 10;
  const [filterType, setFilterType] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deletingTx, setDeletingTx] = useState(null);
  const [deleteInFlight, setDeleteInFlight] = useState(false);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    apiClient.get('/categories').then(res => setCategories(Array.isArray(res.data)?res.data:res.data.categories??[])).catch(()=>{});
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit:LIMIT };
      if (filterType) params.type = filterType;
      if (filterCategoryId) params.category_id = filterCategoryId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      const res = await apiClient.get('/transactions', { params });
      if (Array.isArray(res.data)) { setTransactions(res.data); setTotalPages(1); setTotalCount(res.data.length); }
      else { setTransactions(res.data.data??[]); setTotalPages(res.data.pagination?.totalPages??1); setTotalCount(res.data.pagination?.total??0); }
    } catch (err) { setError(err?.response?.data?.message||'Failed to load transactions.'); }
    finally { setLoading(false); }
  }, [page, filterType, filterCategoryId, filterStartDate, filterEndDate]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  function handleSave(saved) {
    if (editingTx) setTransactions(prev=>prev.map(t=>t.id===saved.id?saved:t));
    else { setTransactions(prev=>[saved,...prev].slice(0,LIMIT)); setTotalCount(p=>p+1); }
    setShowForm(false); setEditingTx(null);
  }

  async function handleDeleteConfirm() {
    if (!deletingTx) return;
    setDeleteInFlight(true);
    try {
      await apiClient.delete('/transactions/'+deletingTx.id);
      setTransactions(prev=>prev.filter(t=>t.id!==deletingTx.id));
      setTotalCount(p=>Math.max(0,p-1));
      setDeletingTx(null);
    } catch (err) { setError(err?.response?.data?.message||'Failed to delete.'); setDeletingTx(null); }
    finally { setDeleteInFlight(false); }
  }

  function getCategoryName(tx) {
    if (tx.category_name) return tx.category_name;
    const c = categories.find(c=>c.id===tx.category_id);
    return c ? c.name : '-';
  }

  const filterInputStyle = { padding:'8px 12px', fontSize:'13px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'8px', color:'#e2e8f0', minWidth:'130px' };

  return (
    <div style={{minHeight:'100vh',backgroundColor:'transparent',fontFamily:"'Inter',system-ui,sans-serif",padding:'32px 28px',boxSizing:'border-box',position:'relative',overflow:'hidden'}}>
      <div style={{position:'relative',zIndex:1}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'28px',flexWrap:'wrap',gap:'16px'}}>
          <div>
            <div style={{fontSize:'12px',color:'rgba(99,102,241,0.8)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:'6px',fontWeight:'600'}}>NEXUS FINANCE AI</div>
            <h1 style={{margin:0,fontSize:'32px',fontWeight:'800',color:'#e2e8f0',letterSpacing:'-0.02em'}}>Transactions</h1>
            <p style={{margin:'6px 0 0',fontSize:'14px',color:'rgba(165,180,252,0.5)'}}>{totalCount} total records</p>
          </div>
          <button onClick={()=>{setEditingTx(null);setShowForm(true);}} style={{padding:'11px 22px',fontSize:'14px',fontWeight:'700',color:'#fff',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:'12px',cursor:'pointer',boxShadow:'0 0 24px rgba(99,102,241,0.4)',transition:'all 0.2s',alignSelf:'flex-start'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 0 32px rgba(99,102,241,0.6)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 0 24px rgba(99,102,241,0.4)';}}>
            + Add Transaction
          </button>
        </div>

        {/* Filter bar */}
        <div style={{background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'14px',padding:'16px 20px',marginBottom:'20px',display:'flex',flexWrap:'wrap',gap:'12px',alignItems:'flex-end',animation:'fadeInUp 0.4s ease both'}}>
          {[
            {label:'Type', el:<select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}} style={{...filterInputStyle,cursor:'pointer'}}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>},
            {label:'Category', el:<select value={filterCategoryId} onChange={e=>{setFilterCategoryId(e.target.value);setPage(1);}} style={{...filterInputStyle,cursor:'pointer'}}><option value="">All categories</option>{categories.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>},
            {label:'From', el:<input type="date" value={filterStartDate} onChange={e=>{setFilterStartDate(e.target.value);setPage(1);}} style={filterInputStyle} />},
            {label:'To', el:<input type="date" value={filterEndDate} onChange={e=>{setFilterEndDate(e.target.value);setPage(1);}} style={filterInputStyle} />},
          ].map(({label,el})=>(
            <div key={label} style={{display:'flex',flexDirection:'column',gap:'4px'}}>
              <label style={{fontSize:'10px',fontWeight:'700',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{label}</label>
              {el}
            </div>
          ))}
        </div>

        {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',padding:'12px 16px',marginBottom:'16px',color:'#fca5a5',fontSize:'14px'}}>{error}</div>}

        {loading ? (
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'200px'}}>
            <div style={{width:'44px',height:'44px',border:'3px solid rgba(99,102,241,0.2)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
          </div>
        ) : (
          <div style={{background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'16px',overflow:'hidden',animation:'fadeInUp 0.4s ease 0.1s both'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'14px'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(99,102,241,0.15)'}}>
                    {['Date','Description','Category','Type','Amount','Actions'].map(h=>(
                      <th key={h} style={{padding:'14px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'rgba(165,180,252,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={6} style={{padding:'48px 16px',textAlign:'center',color:'rgba(165,180,252,0.3)',fontSize:'14px'}}>
                      <div style={{fontSize:'36px',marginBottom:'10px'}}>~</div>
                      No transactions found. Add one to get started.
                    </td></tr>
                  ) : transactions.map((tx,i)=>(
                    <tr key={tx.id} className="tx-row" style={{borderBottom:'1px solid rgba(99,102,241,0.06)',animation:`fadeInUp 0.3s ease ${i*0.04}s both`}}>
                      <td style={{padding:'13px 16px',color:'rgba(165,180,252,0.7)',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>{formatDate(tx.date)}</td>
                      <td style={{padding:'13px 16px',color:'#e2e8f0',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fixEncoding(tx.description) || '-'}</td>
                      <td style={{padding:'13px 16px',color:'rgba(165,180,252,0.7)'}}>{getCategoryName(tx)}</td>
                      <td style={{padding:'13px 16px'}}>
                        <span style={{display:'inline-block',padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.06em',background:tx.type==='income'?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)',color:tx.type==='income'?'#6ee7b7':'#fca5a5',border:`1px solid ${tx.type==='income'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>{tx.type}</span>
                      </td>
                      <td style={{padding:'13px 16px',fontWeight:'700',fontVariantNumeric:'tabular-nums',color:tx.type==='income'?'#6ee7b7':'#fca5a5'}}>{formatCurrency(tx.amount)}</td>
                      <td style={{padding:'10px 16px',whiteSpace:'nowrap'}}>
                        <button onClick={()=>{setEditingTx(tx);setShowForm(true);}} style={{padding:'5px 12px',fontSize:'12px',fontWeight:'600',color:'#a5b4fc',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:'7px',cursor:'pointer',marginRight:'6px'}}>Edit</button>
                        <button onClick={()=>setDeletingTx(tx)} style={{padding:'5px 12px',fontSize:'12px',fontWeight:'600',color:'#fca5a5',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'7px',cursor:'pointer'}}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderTop:'1px solid rgba(99,102,241,0.1)',flexWrap:'wrap',gap:'10px'}}>
                <span style={{fontSize:'13px',color:'rgba(165,180,252,0.4)'}}>Page {page} of {totalPages} · {totalCount} records</span>
                <div style={{display:'flex',gap:'6px'}}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:'6px 14px',fontSize:'13px',fontWeight:'600',background:page===1?'rgba(99,102,241,0.05)':'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'8px',cursor:page===1?'not-allowed':'pointer',color:page===1?'rgba(165,180,252,0.2)':'#a5b4fc'}}>Prev</button>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:'6px 14px',fontSize:'13px',fontWeight:'600',background:page===totalPages?'rgba(99,102,241,0.05)':'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'8px',cursor:page===totalPages?'not-allowed':'pointer',color:page===totalPages?'rgba(165,180,252,0.2)':'#a5b4fc'}}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingTx ? 'Edit Transaction' : 'Add Transaction'} onClose={()=>{setShowForm(false);setEditingTx(null);}}>
          <TransactionForm initialData={editingTx} categories={categories} onSave={handleSave} onClose={()=>{setShowForm(false);setEditingTx(null);}} />
        </Modal>
      )}

      {deletingTx && (
        <Modal title="Delete Transaction" onClose={()=>setDeletingTx(null)}>
          <p style={{fontSize:'15px',color:'rgba(226,232,240,0.8)',marginBottom:'8px'}}>Are you sure you want to delete this transaction?</p>
          <p style={{fontSize:'13px',color:'rgba(165,180,252,0.4)',marginBottom:'24px'}}>{deletingTx.description || getCategoryName(deletingTx)} - {formatCurrency(deletingTx.amount)} on {formatDate(deletingTx.date)}</p>
          <div style={{display:'flex',justifyContent:'flex-end',gap:'10px'}}>
            <button onClick={()=>setDeletingTx(null)} style={{padding:'10px 20px',fontSize:'14px',color:'rgba(165,180,252,0.6)',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'10px',cursor:'pointer'}}>Cancel</button>
            <button onClick={handleDeleteConfirm} disabled={deleteInFlight} style={{padding:'10px 20px',fontSize:'14px',fontWeight:'700',color:'#fff',background:deleteInFlight?'rgba(239,68,68,0.3)':'linear-gradient(135deg,#ef4444,#dc2626)',border:'none',borderRadius:'10px',cursor:deleteInFlight?'not-allowed':'pointer'}}>
              {deleteInFlight ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Transactions;
