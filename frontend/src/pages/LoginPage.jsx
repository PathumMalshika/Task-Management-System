import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Alert, Spinner, FormField } from '../components/UI'
import { RoleBadge } from '../components/UI'

const DEMO_ACCOUNTS = [
  { role:'admin',      email:'admin@taskmanager.com',   password:'Admin@1234' },
  { role:'manager',    email:'manager@taskmanager.com', password:'Manager@1234' },
  { role:'technician', email:'tech@taskmanager.com',    password:'Tech@1234' },
]

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [errors,   setErrors]   = useState({})
  const { login }  = useAuth()
  const toast      = useToast()
  const navigate   = useNavigate()

  // Show message if session expired
const [sessionMsg, setSessionMsg] = useState('')

useEffect(() => {
  const reason = sessionStorage.getItem('logout_reason')
  if (reason) {
    setSessionMsg(reason)
    sessionStorage.removeItem('logout_reason')
  }
}, [])

  const validate = () => {
    const e = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email required'
    if (!password) e.password = 'Password is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (em, pw) => {
    setEmail(em); setPassword(pw)
    setError(''); setErrors({})
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <CheckCheck size={26} color="#fff" />
          </div>
          <h1>TaskManager</h1>
          <p>Command &amp; Control System</p>
        </div>

        {sessionMsg && <Alert type="info">{sessionMsg}</Alert>}

        {/* Error */}
        {error && <Alert type="error">{error}</Alert>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FormField label="Email Address" required error={errors.email}>
            <input
              type="email"
              className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({...v, email:''})) }}
              autoComplete="email"
            />
          </FormField>

          <FormField label="Password" required error={errors.password}>
            <div className="input-pw">
              <input
                type={showPw ? 'text' : 'password'}
                className={`form-control ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({...v, password:''})) }}
                autoComplete="current-password"
              />
              <button type="button" className="toggle-pw" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </FormField>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:'0.95rem', marginTop:4 }}
          >
            {loading ? <><Spinner size={16} /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        {/* Demo divider */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0', color:'var(--text-muted)', fontSize:'0.75rem' }}>
          <div style={{ flex:1, height:1, background:'var(--border)' }}/>
          demo accounts
          <div style={{ flex:1, height:1, background:'var(--border)' }}/>
        </div>

        {/* Demo accounts */}
        <div className="demo-accounts">
          <h4>Quick Login</h4>
          {DEMO_ACCOUNTS.map(({ role, email: em, password: pw }) => (
            <div className="demo-item" key={role}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <RoleBadge role={role} />
                <span style={{ color:'var(--text-muted)', fontFamily:"'DM Mono',monospace", fontSize:'0.73rem' }}>{em}</span>
              </div>
              <button className="demo-use" onClick={() => fillDemo(em, pw)}>Use</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}