import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { Modal, ConfirmModal, Spinner, EmptyState, Alert, FormField, RoleBadge } from '../components/UI'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { formatDate, avatarColor, initials } from '../utils/helpers'

const EMPTY_FORM = { name:'', email:'', password:'', role:'technician', is_active:1 }

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth()
  const toast = useToast()

  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [formErr,   setFormErr]   = useState({})
  const [saveErr,   setSaveErr]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [deleting,  setDeleting]  = useState(false)
  const [search,    setSearch]    = useState('')
  const [roleFilter,setRoleFilter]= useState('')
  const [topbarEl,  setTopbarEl]  = useState(null)

  useEffect(() => {
    load()
    const el = document.getElementById('topbar-actions')
    if (el) setTopbarEl(el)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data.data || data || [])
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
    return true
  }), [users, roleFilter, search])

  /* ── Modal ───────────────────────────────────────────────── */
  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormErr({}); setSaveErr('')
    setModalOpen(true)
  }

  const openEdit = u => {
    setEditingId(u.id)
    setForm({ name:u.name, email:u.email, password:'', role:u.role, is_active:u.is_active ? 1 : 0 })
    setFormErr({}); setSaveErr('')
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!editingId && (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)))
      e.email = 'Valid email required'
    if (!editingId && form.password.length < 8)
      e.password = 'Min. 8 characters required'
    setFormErr(e)
    return !Object.keys(e).length
  }

  const handleSave = async () => {
    setSaveErr('')
    if (!validate()) return
    setSaving(true)
    const body = editingId
      ? { name: form.name, role: form.role, is_active: Number(form.is_active), ...(form.password ? { password: form.password } : {}) }
      : { name: form.name, email: form.email, password: form.password, role: form.role }
    try {
      if (editingId) await api.put(`/users/${editingId}`, body)
      else           await api.post('/users', body)
      toast.success(editingId ? 'User updated' : 'User created')
      setModalOpen(false)
      load()
    } catch (err) {
      setSaveErr(err.response?.data?.error || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/users/${confirmId}`)
      toast.success('User deleted')
      setConfirmId(null)
      setUsers(prev => prev.filter(u => u.id !== confirmId))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout title="User Management">
      {/* Topbar create button */}
      {isAdmin() && topbarEl && createPortal(
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> New User
        </button>,
        topbarEl
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={15} className="search-box-icon" />
          <input
            className="search-input"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-control" style={{ width:'auto', minWidth:140 }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="technician">Technician</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" message="Try adjusting your search or filters" />
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {filtered.map(u => {
            const isCurrentUser = u.id === currentUser?.id
            const canEdit   = isAdmin()
            const canDelete = isAdmin() && !isCurrentUser

            return (
              <div className="user-card" key={u.id}>
                <div className="card-body" style={{ padding:20 }}>
                  {/* Header row */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      {/* Avatar with active dot */}
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <div style={{
                          width:48, height:48, borderRadius:'50%',
                          background: avatarColor(u.role),
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontFamily:"'Syne',sans-serif", fontWeight:800,
                          fontSize:'1rem', color:'#fff',
                        }}>
                          {initials(u.name)}
                        </div>
                        <div style={{
                          position:'absolute', bottom:1, right:1,
                          width:11, height:11, borderRadius:'50%',
                          background: u.is_active ? 'var(--green)' : 'var(--text-muted)',
                          border:'2px solid var(--bg-card)',
                        }} />
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.92rem' }}>
                          {u.name}
                          {isCurrentUser && (
                            <span style={{ fontSize:'0.68rem', color:'var(--accent)', fontFamily:"'DM Mono',monospace", marginLeft:6 }}>
                              (you)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:'0.76rem', color:'var(--text-muted)', marginTop:2, maxWidth:170, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                             title={u.email}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>

                  {/* Meta */}
                  <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.7rem', color:'var(--text-muted)' }}>
                      Joined {formatDate(u.created_at)}
                    </span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.7rem',
                      color: u.is_active ? 'var(--green)' : 'var(--text-muted)' }}>
                      ● {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <div style={{ display:'flex', gap:8, borderTop:'1px solid var(--border)', paddingTop:14 }}>
                      {canEdit && (
                        <button className="btn btn-secondary btn-sm" style={{ flex:1, justifyContent:'center' }} onClick={() => openEdit(u)}>
                          <Edit2 size={13} /> Edit
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(u.id)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit User' : 'New User'}
        maxWidth={480}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={14} /> : null} Save User
            </button>
          </>
        }
      >
        {saveErr && <Alert type="error">{saveErr}</Alert>}

        <FormField label="Full Name" required error={formErr.name}>
          <input className={`form-control ${formErr.name?'error':''}`} placeholder="Jane Smith"
            value={form.name} onChange={e => { setForm(v=>({...v,name:e.target.value})); setFormErr(v=>({...v,name:''})) }} />
        </FormField>

        {!editingId && (
          <FormField label="Email Address" required error={formErr.email}>
            <input type="email" className={`form-control ${formErr.email?'error':''}`} placeholder="jane@company.com"
              value={form.email} onChange={e => { setForm(v=>({...v,email:e.target.value})); setFormErr(v=>({...v,email:''})) }} />
          </FormField>
        )}

        <div className="form-row">
          <FormField label="Role" required>
            <select className="form-control" value={form.role} onChange={e => setForm(v=>({...v,role:e.target.value}))}>
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
          {editingId && (
            <FormField label="Status">
              <select className="form-control" value={form.is_active} onChange={e => setForm(v=>({...v,is_active:Number(e.target.value)}))}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </FormField>
          )}
        </div>

        <FormField label={editingId ? 'New Password (leave blank to keep)' : 'Password'} required={!editingId} error={formErr.password}>
          <input type="password" className={`form-control ${formErr.password?'error':''}`}
            placeholder={editingId ? 'Leave blank to keep current' : 'Min. 8 characters'}
            value={form.password} onChange={e => { setForm(v=>({...v,password:e.target.value})); setFormErr(v=>({...v,password:''})) }} />
        </FormField>
      </Modal>

      {/* Confirm delete */}
      <ConfirmModal
        open={!!confirmId}
        message="This user will be permanently removed. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
      />
    </Layout>
  )
}