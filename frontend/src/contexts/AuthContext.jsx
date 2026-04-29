import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// ── Config ─────────────────────────────────────────────────────
const INACTIVITY_LIMIT = 30 * 60 * 1000  // 30 minutes in milliseconds
const WARNING_BEFORE   = 2  * 60 * 1000  // show warning 2 min before logout
// ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showWarning, setShowWarning] = useState(false)

  const inactivityTimer = useRef(null)
  const warningTimer    = useRef(null)

  // ── Load user from localStorage on mount ─────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tm_user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {}
    setLoading(false)
  }, [])

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(async (reason = 'manual') => {
    clearTimeout(inactivityTimer.current)
    clearTimeout(warningTimer.current)
    setShowWarning(false)
    try {
      await api.post('/auth/logout', {
        refreshToken: localStorage.getItem('tm_refresh')
      })
    } catch {}
    localStorage.clear()
    setUser(null)
    // If auto-logout, show message on login page
    if (reason === 'inactivity') {
      sessionStorage.setItem('logout_reason', 'Session expired due to inactivity')
    }
  }, [])

  // ── Reset inactivity timer on any user action ─────────────
  const resetTimer = useCallback(() => {
    if (!localStorage.getItem('tm_token')) return

    clearTimeout(inactivityTimer.current)
    clearTimeout(warningTimer.current)
    setShowWarning(false)

    // Show warning 2 minutes before auto-logout
    warningTimer.current = setTimeout(() => {
      setShowWarning(true)
    }, INACTIVITY_LIMIT - WARNING_BEFORE)

    // Auto logout after inactivity limit
    inactivityTimer.current = setTimeout(() => {
      logout('inactivity')
    }, INACTIVITY_LIMIT)
  }, [logout])

  // ── Attach activity listeners when user is logged in ──────
  useEffect(() => {
    if (!user) {
      clearTimeout(inactivityTimer.current)
      clearTimeout(warningTimer.current)
      return
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    // Start the timer immediately on login
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(inactivityTimer.current)
      clearTimeout(warningTimer.current)
    }
  }, [user, resetTimer])

  // ── Also check token expiry on tab focus ──────────────────
  useEffect(() => {
    const handleFocus = () => {
      const token = localStorage.getItem('tm_token')
      if (!token && user) {
        // Token was cleared in another tab
        setUser(null)
        localStorage.clear()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  // ── Login ─────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const result = data.data || data
    localStorage.setItem('tm_token',   result.accessToken)
    localStorage.setItem('tm_refresh', result.refreshToken)
    localStorage.setItem('tm_user',    JSON.stringify(result.user))
    setUser(result.user)
    return result.user
  }, [])

  const isAdmin   = () => user?.role === 'admin'
  const isManager = () => user?.role === 'admin' || user?.role === 'manager'
  const hasRole   = (...roles) => roles.includes(user?.role)

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      isAdmin, isManager, hasRole,
      showWarning, setShowWarning,
      resetTimer,
    }}>
      {children}

      {/* ── Inactivity Warning Modal ────────────────────────── */}
      {showWarning && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.5)',
          backdropFilter:'blur(4px)',
          zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:20,
        }}>
          <div style={{
            background:'var(--bg-card)',
            border:'1px solid var(--border-light)',
            borderRadius:'var(--radius-xl)',
            padding:'32px', maxWidth:400, width:'100%',
            boxShadow:'var(--shadow-lg)',
            textAlign:'center',
          }}>
            {/* Icon */}
            <div style={{
              width:56, height:56, borderRadius:'50%',
              background:'var(--yellow-dim)',
              border:'1px solid rgba(202,138,4,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 20px',
              fontSize:'1.8rem',
            }}>
              ⏱️
            </div>

            <h3 style={{
              fontFamily:"'Syne',sans-serif",
              fontSize:'1.1rem', marginBottom:10,
              color:'var(--text-primary)',
            }}>
              Session Expiring Soon
            </h3>

            <p style={{
              color:'var(--text-secondary)',
              fontSize:'0.88rem', marginBottom:24, lineHeight:1.6,
            }}>
              You have been inactive for a while. You will be automatically
              logged out in <strong style={{ color:'var(--yellow)' }}>2 minutes</strong>.
            </p>

            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button
                onClick={() => logout('inactivity')}
                style={{
                  padding:'10px 20px',
                  background:'transparent',
                  border:'1px solid var(--border-light)',
                  borderRadius:'var(--radius)',
                  color:'var(--text-secondary)',
                  cursor:'pointer',
                  fontFamily:"'Outfit',sans-serif",
                  fontSize:'0.85rem',
                }}
              >
                Log Out Now
              </button>
              <button
                onClick={() => { setShowWarning(false); resetTimer() }}
                style={{
                  padding:'10px 20px',
                  background:'var(--accent)',
                  border:'1px solid var(--accent)',
                  borderRadius:'var(--radius)',
                  color:'#fff',
                  cursor:'pointer',
                  fontFamily:"'Outfit',sans-serif",
                  fontSize:'0.85rem',
                  fontWeight:600,
                }}
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)