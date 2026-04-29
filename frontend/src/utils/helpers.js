export const avatarColor = role => ({
  admin:      '#f56565',
  manager:    '#f5c842',
  technician: '#3ecf8e',
}[role] || '#4f9cf9')

export const initials = name =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

export const formatDate = d => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}

export const formatDateTime = d => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
}

export const timeAgo = d => {
  const diff = (Date.now() - new Date(d)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export const statusLabel = s => ({
  pending:    'Pending',
  in_progress:'In Progress',
  completed:  'Completed',
  cancelled:  'Cancelled',
}[s] || s)

export const actionType = action => {
  if (action?.includes('LOGIN'))       return 'LOGIN'
  if (action?.startsWith('CREATE'))    return 'CREATE'
  if (action?.startsWith('UPDATE'))    return 'UPDATE'
  if (action?.startsWith('DELETE'))    return 'DELETE'
  return 'OTHER'
}

export const escHtml = s =>
  String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')