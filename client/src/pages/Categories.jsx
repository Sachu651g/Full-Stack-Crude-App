// Categories.jsx — Futuristic category management page
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client.js';

function injectStyles() {
  if (document.getElementById('kiro-cat-styles')) return;
  const s = document.createElement('style');
  s.id = 'kiro-cat-styles';
  s.textContent = `
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    .cat-row:hover { background:rgba(99,102,241,0.08) !important; }
    .cat-row { transition:background 0.2s; }
    input:focus, select:focus { border-color:rgba(99,102,241,0.6) !important; box-shadow:0 0 0 3px rgba(99,102,241,0.15) !important; }
  `;
  document.head.appendChild(s);
}

// Proper emoji icons — indexed by category.id % length
const CATEGORY_ICONS = [
  '🍔', '🚗', '🏠', '💊', '🎮', '📚', '✈️', '👗',
  '💡', '🎵', '🏋️', '🍾', '💼', '🎁', '🔧', '🛒',
  '🐾', '🌿', '📱', '🎨',
];

// Map common category names to specific icons
const NAME_ICON_MAP = {
  entertainment: '🎮',
  food: '🍔',
  health: '💊',
  other: '📦',
  rent: '🏠',
  salary: '💼',
  transport: '🚗',
  shopping: '🛒',
  utilities: '💡',
  travel: '✈️',
  education: '📚',
  fitness: '🏋️',
  music: '🎵',
  clothing: '👗',
  gifts: '🎁',
  pets: '🐾',
  groceries: '🛒',
  insurance: '🛡️',
  investment: '📈',
  savings: '💰',
};

function getCategoryIcon(category) {
  const key = category.name.toLowerCase().trim();
  for (const [k, icon] of Object.entries(NAME_ICON_MAP)) {
    if (key.includes(k)) return icon;
  }
  return CATEGORY_ICONS[category.id % CATEGORY_ICONS.length];
}

function CategoryRow({ category, onUpdated, onDeleted, index }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowError, setRowError] = useState('');
  const icon = getCategoryIcon(category);

  async function handleSave() {
    const trimmed = editName.trim();
    if (!trimmed) { setRowError('Name cannot be empty.'); return; }
    setSaving(true); setRowError('');
    try {
      const res = await apiClient.put('/categories/' + category.id, { name: trimmed });
      onUpdated(res.data); setEditing(false);
    } catch (err) { setRowError(err?.response?.data?.message || 'Failed to update.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Delete category "' + category.name + '"?')) return;
    setDeleting(true); setRowError('');
    try {
      await apiClient.delete('/categories/' + category.id);
      onDeleted(category.id);
    } catch (err) {
      const msg = err?.response?.data?.message;
      setRowError(err?.response?.status === 409 ? (msg || 'Cannot delete: used by transactions.') : (msg || 'Failed to delete.'));
    } finally { setDeleting(false); }
  }

  return (
    <div className="cat-row" style={{
      display:'flex', alignItems:'center', padding:'14px 20px', gap:'12px', flexWrap:'wrap',
      borderBottom:'1px solid rgba(99,102,241,0.08)',
      animation:`fadeInUp 0.4s ease ${index*0.05}s both`,
    }}>
      <div style={{
        width:'36px', height:'36px', borderRadius:'10px',
        background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'18px', flexShrink:0,
        fontFamily:'"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
      }}>
        {icon}
      </div>
      {editing ? (
        <>
          <input value={editName} onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditName(category.name); setEditing(false); } }}
            autoFocus style={{ flex:'1 1 120px', padding:'8px 12px', fontSize:'14px', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:'8px', outline:'none', color:'#e2e8f0', boxSizing:'border-box' }} />
          <button onClick={handleSave} disabled={saving} style={{ padding:'7px 16px', fontSize:'13px', fontWeight:'600', color:'#fff', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'8px', cursor:'pointer' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => { setEditName(category.name); setEditing(false); }} style={{ padding:'7px 14px', fontSize:'13px', color:'rgba(165,180,252,0.6)', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'8px', cursor:'pointer' }}>Cancel</button>
        </>
      ) : (
        <>
          <span style={{ flex:'1 1 120px', fontSize:'15px', color:'#e2e8f0', fontWeight:'500' }}>{category.name}</span>
          <div style={{ display:'flex', gap:'6px', marginLeft:'auto' }}>
            <button onClick={() => { setEditName(category.name); setRowError(''); setEditing(true); }} style={{ padding:'6px 14px', fontSize:'12px', fontWeight:'600', color:'#a5b4fc', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'7px', cursor:'pointer' }}>Edit</button>
            <button onClick={handleDelete} disabled={deleting} style={{ padding:'6px 14px', fontSize:'12px', fontWeight:'600', color:'#fca5a5', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'7px', cursor:'pointer' }}>
              {deleting ? '...' : 'Delete'}
            </button>
          </div>
        </>
      )}
      {rowError && <p style={{ width:'100%', fontSize:'12px', color:'#f87171', margin:'4px 0 0' }}>{rowError}</p>}
    </div>
  );
}

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { injectStyles(); }, []);

  const fetchCategories = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiClient.get('/categories');
      setCategories(Array.isArray(res.data) ? res.data : res.data.categories ?? []);
    } catch (err) { setError(err?.response?.data?.message || 'Failed to load categories.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true); setError(''); setSuccessMsg('');
    try {
      const res = await apiClient.post('/categories', { name: trimmed });
      setCategories(prev => [...prev, res.data]);
      setNewName('');
      setSuccessMsg('Category "' + res.data.name + '" added.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) { setError(err?.response?.data?.message || 'Failed to add category.'); }
    finally { setAdding(false); }
  }

  return (
    <div style={{ minHeight:'100vh', backgroundColor:'transparent', fontFamily:"'Inter',system-ui,sans-serif", padding:'32px 28px', boxSizing:'border-box', position:'relative' }}>
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'12px', color:'rgba(99,102,241,0.8)', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'6px', fontWeight:'600' }}>NEXUS FINANCE AI</div>
          <h1 style={{ margin:0, fontSize:'32px', fontWeight:'800', color:'#e2e8f0', letterSpacing:'-0.02em' }}>Categories</h1>
          <p style={{ margin:'6px 0 0', fontSize:'14px', color:'rgba(165,180,252,0.5)' }}>Organize your transactions with custom categories</p>
        </div>

        {/* Add form */}
        <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'24px', marginBottom:'24px', animation:'fadeInUp 0.4s ease both' }}>
          <div style={{ fontSize:'12px', color:'rgba(165,180,252,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px', fontWeight:'600' }}>+ Add New Category</div>
          <form onSubmit={handleAdd} style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Category name..." maxLength={80}
              style={{ flex:'1 1 200px', padding:'10px 14px', fontSize:'14px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'10px', outline:'none', color:'#e2e8f0', boxSizing:'border-box' }} />
            <button type="submit" disabled={adding || !newName.trim()} style={{ padding:'10px 24px', fontSize:'14px', fontWeight:'700', color:'#fff', background: adding || !newName.trim() ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', cursor: adding || !newName.trim() ? 'not-allowed' : 'pointer', boxShadow: adding || !newName.trim() ? 'none' : '0 0 20px rgba(99,102,241,0.4)', transition:'all 0.2s' }}>
              {adding ? 'Adding...' : '+ Add Category'}
            </button>
          </form>
        </div>

        {successMsg && <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', fontSize:'14px', color:'#6ee7b7' }}>✓ {successMsg}</div>}
        {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', fontSize:'14px', color:'#fca5a5' }}>⚠ {error}</div>}

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'160px' }}>
            <div style={{ width:'40px', height:'40px', border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(10,15,30,0.95))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', overflow:'hidden', animation:'fadeInUp 0.4s ease 0.1s both' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'12px', fontWeight:'700', color:'rgba(165,180,252,0.5)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Category Name</span>
              <span style={{ fontSize:'12px', color:'rgba(165,180,252,0.3)' }}>{categories.length} total</span>
            </div>
            {categories.length === 0 ? (
              <div style={{ padding:'48px 20px', textAlign:'center', color:'rgba(165,180,252,0.3)', fontSize:'14px' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>◈</div>
                No categories yet. Add one above to get started.
              </div>
            ) : (
              categories.map((cat, i) => (
                <CategoryRow key={cat.id} category={cat} index={i}
                  onUpdated={updated => setCategories(prev => prev.map(c => c.id === updated.id ? updated : c))}
                  onDeleted={id => setCategories(prev => prev.filter(c => c.id !== id))} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Categories;
