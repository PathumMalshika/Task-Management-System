import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Users, FileText,
  LogOut, CheckCheck, Menu, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { avatarColor, initials } from '../utils/helpers'
import { RoleBadge } from './UI'

export default function Layout({ children, title }) {
  const { user, logout, isAdmin, isManager } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.info('Signed out successfully')
    navigate('/')
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, always: true },
    { to: '/tasks',     label: 'Tasks',       icon: CheckSquare,     always: true },
    { to: '/users',     label: 'Users',       icon: Users,           show: isManager() },
    { to: '/audit',     label: 'Audit Logs',  icon: FileText,        show: isAdmin() },
  ].filter(n => n.always || n.show)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            <div className="brand-icon">
              <CheckCheck size={20} color="#fff" />
            </div>
            <div>
              <div className="brand-name">TaskManager</div>
              <div className="brand-tagline">v2.0 · {user?.role}</div>
            </div>
          </div>
        </div>

        {/* User pill */}
        <div className="sidebar-user">
          <div className="user-pill">
            <div
              className="user-avatar"
              style={{ background: avatarColor(user?.role) }}
            >
              {initials(user?.name)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="user-name">{user?.name}</div>
              <RoleBadge role={user?.role || 'technician'} />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="topbar-title">{title}</div>
          <div className="topbar-actions" id="topbar-actions" />
        </header>

        {/* Page */}
        <main className="page-body">{children}</main>
      </div>
    </div>
  )
}