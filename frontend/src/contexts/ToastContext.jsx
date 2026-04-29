import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, removing: false }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250)
    }, duration)
  }, [])

  const remove = useCallback(id => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 250)
  }, [])

  const toast = {
    success: msg => show(msg, 'success'),
    error:   msg => show(msg, 'error', 4500),
    info:    msg => show(msg, 'info'),
  }

  const icons = { success: CheckCircle, error: XCircle, info: Info }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className={`toast ${t.type} ${t.removing ? 'removing' : ''}`}>
              <span className="toast-icon"><Icon size={16} /></span>
              <span className="toast-msg">{t.message}</span>
              <button onClick={() => remove(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', marginLeft:'auto' }}>
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)