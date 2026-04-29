import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Edit2, Trash2, CheckSquare } from 'lucide-react'
import Layout from '../components/Layout'
import { StatusBadge, PriorityBadge, Modal, ConfirmModal, Spinner, EmptyState, Alert, FormField } from '../components/UI'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { formatDate, timeAgo, initials } from '../utils/helpers'

const EMPTY_FORM = {
  title:'', description:'', status:'pending',
  priority:'medium', assigned_to:'', due_date:''
}

export default function TasksPage() {
  const { user, isManager } = useAuth()
  const toast = useToast()

  const [tasks,     setTasks]     = useState([])
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
  const [fStatus,   setFStatus]   = useState('')
  const [fPriority, setFPriority] = useState('')
  const [page,      setPage]      = useState(1)
  const PAGE = 10

  const load = async () => {
    setLoading(true)
    try {
      const [tr, ur] = await Promise.allSettled([
        api.get('/tasks'),
        isManager() ? api.get('/users') : Promise.resolve(null),
      ])
      setTasks(tr.value?.data?.data || tr.value?.data || [])
      setUsers(ur.value?.data?.data || ur.value?.data || [])
    } catch { toast.error('Failed to load tasks') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  /* ── Filtering ───────────────────────────────────────────── */
  const filtered = useMemo(() => tasks.filter(t => {
    if (fStatus   && t.status   !== fStatus)   return false
    if (fPriority && t.priority !== fPriority) return false
    if (search) {
      const q = search.toLowerCase()
      return t.title.toLowerCase().includes(q) ||
        (t.description||'').toLowerCase().includes(q) ||
        (t.assignee_name||'').toLowerCase().includes(q)
    }
    return true
  }), [tasks, fStatus, fPriority, search])

  const pages  = Math.ceil(filtered.length / PAGE)
  const paged  = filtered.slice((page-1)*PAGE, page*PAGE)

  /* ── Modal helpers ───────────────────────────────────────── */
  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormErr({}); setSaveErr('')
    setModalOpen(true)
  }

  const openEdit = task => {
    setEditingId(task.id)
    setForm({
      title:       task.title,
      description: task.description || '',
      status:      task.status,
      priority:    task.priority,
      assigned_to: task.assigned_to || '',
      due_date:    task.due_date
        ? new Date(new Date(task.due_date).getTime() - new Date(task.due_date).getTimezoneOffset()*60000)
            .toISOString().slice(0,16)
        : '',
    })
    setFormErr({}); setSaveErr('')
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!editingId && !form.title.trim()) e.title = 'Title is required'
    setFormErr(e)
    return !Object.keys(e).length
  }

  const handleSave = async () => {
    setSaveErr('')
    if (!validate()) return
    setSaving(true)
    const isTech = user?.role === 'technician'
    const body = isTech
      ? { status: form.status }
      : {
          title:       form.title.trim(),
          description: form.description.trim() || null,
          status:      form.status,
          priority:    form.priority,
          assigned_to: form.assigned_to || null,
          due_date:    form.due_date || null,
        }
    try {
      if (editingId) await api.put(`/tasks/${editingId}`, body)
      else           await api.post('/tasks', body)
      toast.success(editingId ? 'Task updated' : 'Task created')
      setModalOpen(false)
      load()
    } catch (err) {
      setSaveErr(err.response?.data?.error || 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    setDeleting(true)
    try {
      await api.delete(`/tasks/${confirmId}`)
      toast.success('Task deleted')
      setConfirmId(null)
      setTasks(prev => prev.filter(t => t.id !== confirmId))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const isDueSoon = d => {
    if (!d) return false
    const diff = (new Date(d) - Date.now()) / 86400000
    return diff >= 0 && diff <= 2
  }

  const isTech = user?.role === 'technician'

  return (
    <Layout title="Tasks"
      // Inject create button into topbar via portal trick: we render it inside topbar-actions
    >
      {/* Topbar action via portal */}
      {isManager() && (
        <TopbarPortal>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> New Task
          </button>
        </TopbarPortal>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={15} className="search-box-icon" />
          <input
            className="search-input"
            placeholder="Search tasks…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="form-control" style={{ width:'auto', minWidth:140 }}
          value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="form-control" style={{ width:'auto', minWidth:150 }}
          value={fPriority} onChange={e => { setFPriority(e.target.value); setPage(1) }}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <CheckSquare size={16} /> Task List
            <span className="nav-badge" style={{ fontSize:'0.7rem' }}>{filtered.length}</span>
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th><th>Assigned To</th><th>Status</th>
                  <th>Priority</th><th>Due Date</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={7}>
                    <EmptyState
                      icon={CheckSquare}
                      title="No tasks found"
                      message={search||fStatus||fPriority ? 'Try adjusting your filters' : 'No tasks assigned yet'}
                    />
                  </td></tr>
                ) : paged.map(t => {
                  const canEdit   = !isTech || t.assigned_to === user?.id
                  const canDelete = user?.role === 'admin'
                  return (
                    <tr key={t.id}>
                      <td style={{ maxWidth:220 }}>
                        <div style={{ fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                             title={t.title}>
                          {t.title}
                        </div>
                        {t.description && (
                          <div style={{ fontSize:'0.74rem', color:'var(--text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {t.assignee_name ? (
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div style={{
                              width:24, height:24, borderRadius:'50%',
                              background:'var(--accent-dim)', color:'var(--accent)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:'0.65rem', fontFamily:"'Syne',sans-serif", fontWeight:700, flexShrink:0
                            }}>
                              {initials(t.assignee_name)}
                            </div>
                            <span style={{ fontSize:'0.83rem' }}>{t.assignee_name}</span>
                          </div>
                        ) : (
                          <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.78rem',
                          color: isDueSoon(t.due_date) ? 'var(--red)' : 'var(--text-muted)' }}>
                          {formatDate(t.due_date)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.75rem', color:'var(--text-muted)' }}>
                          {timeAgo(t.created_at)}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          {canEdit && (
                            <button className="icon-btn" title="Edit" onClick={() => openEdit(t)}>
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="icon-btn danger" title="Delete" onClick={() => setConfirmId(t.id)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <span>Showing {(page-1)*PAGE+1}–{Math.min(page*PAGE, filtered.length)} of {filtered.length}</span>
            <div className="pagination-btns">
              {Array.from({ length: pages }, (_,i) => (
                <button key={i} className={`page-btn ${page===i+1?'active':''}`} onClick={() => setPage(i+1)}>
                  {i+1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? (isTech ? 'Update Status' : 'Edit Task') : 'New Task'}
        maxWidth={560}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={14} /> : null} Save Task
            </button>
          </>
        }
      >
        {saveErr && <Alert type="error">{saveErr}</Alert>}

        {!isTech && (
          <FormField label="Title" required error={formErr.title}>
            <input
              className={`form-control ${formErr.title?'error':''}`}
              placeholder="Task title"
              value={form.title}
              onChange={e => { setForm(v=>({...v,title:e.target.value})); setFormErr(v=>({...v,title:''})) }}
            />
          </FormField>
        )}

        {!isTech && (
          <FormField label="Description">
            <textarea
              className="form-control"
              placeholder="Describe the task…"
              value={form.description}
              onChange={e => setForm(v=>({...v,description:e.target.value}))}
            />
          </FormField>
        )}

        <div className="form-row">
          <FormField label="Status" required>
            <select className="form-control" value={form.status}
              onChange={e => setForm(v=>({...v,status:e.target.value}))}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
          <FormField label="Priority" required>
            <select className="form-control" value={form.priority} disabled={isTech}
              onChange={e => setForm(v=>({...v,priority:e.target.value}))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </FormField>
        </div>

        {isManager() && (
          <div className="form-row">
            <FormField label="Assign To">
              <select className="form-control" value={form.assigned_to}
                onChange={e => setForm(v=>({...v,assigned_to:e.target.value}))}>
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Due Date">
              <input type="datetime-local" className="form-control" value={form.due_date}
                onChange={e => setForm(v=>({...v,due_date:e.target.value}))} />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <ConfirmModal
        open={!!confirmId}
        message="This task will be permanently deleted. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
      />
    </Layout>
  )
}

// Topbar portal - injects action button into topbar
function TopbarPortal({ children }) {
  const [el, setEl] = useState(null)
  useEffect(() => {
    const target = document.getElementById('topbar-actions')
    if (target) setEl(target)
  }, [])
  if (!el) return null
  return createPortal(children, el)
}