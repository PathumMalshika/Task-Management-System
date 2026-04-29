import { X, AlertTriangle, Trash2 } from 'lucide-react'

// ── Badge ─────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const labels = { pending:'Pending', in_progress:'In Progress', completed:'Completed', cancelled:'Cancelled' }
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority.charAt(0).toUpperCase()+priority.slice(1)}</span>
}

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{role.charAt(0).toUpperCase()+role.slice(1)}</span>
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width:size, height:size }} />
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} style={{ margin:'0 auto 16px', opacity:0.25, display:'block' }} />}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop:16 }}>{action}</div>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, maxWidth = 520 }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────
export function ConfirmModal({ open, message, onConfirm, onCancel, loading = false }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth:380 }}>
        <div className="modal-body" style={{ textAlign:'center', padding:'32px 24px' }}>
          <div style={{
            width:48, height:48, borderRadius:'50%',
            background:'var(--red-dim)', border:'1px solid rgba(245,101,101,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', color:'var(--red)'
          }}>
            <Trash2 size={22} />
          </div>
          <h3 style={{ marginBottom:8 }}>Are you sure?</h3>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.88rem' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner size={14} /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────
export function Alert({ type = 'error', children }) {
  const icons = { error: AlertTriangle, info: AlertTriangle, success: AlertTriangle }
  const Icon = icons[type] || AlertTriangle
  return (
    <div className={`alert alert-${type}`}>
      <Icon size={16} style={{ flexShrink:0 }} />
      <span>{children}</span>
    </div>
  )
}

// ── Form Field ────────────────────────────────────────────────
export function FormField({ label, required, error, children }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  )
}