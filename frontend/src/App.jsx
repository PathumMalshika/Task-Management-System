import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import LoginPage    from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage    from './pages/TasksPage'
import UsersPage    from './pages/UsersPage'
import AuditPage    from './pages/AuditPage'

/* ── Route Guards ────────────────────────────────────────────── */
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <span className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

/* ── App ─────────────────────────────────────────────────────── */
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={
              <PublicRoute><LoginPage /></PublicRoute>
            } />

            {/* Protected */}
            <Route path="/dashboard" element={
              <PrivateRoute><DashboardPage /></PrivateRoute>
            } />
            <Route path="/tasks" element={
              <PrivateRoute><TasksPage /></PrivateRoute>
            } />
            <Route path="/users" element={
              <PrivateRoute roles={['admin','manager']}><UsersPage /></PrivateRoute>
            } />
            <Route path="/audit" element={
              <PrivateRoute roles={['admin']}><AuditPage /></PrivateRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}