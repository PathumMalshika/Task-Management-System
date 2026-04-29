import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Clock, RefreshCw, CheckCircle2, AlertTriangle, Users, Plus } from 'lucide-react'
import Layout from '../components/Layout'
import { StatusBadge, PriorityBadge, Spinner, RoleBadge } from '../components/UI'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { formatDate, timeAgo, avatarColor, initials } from '../utils/helpers'

function useCountUp(target, duration = 600) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) { setCount(0); return }
    let start = 0
    const step = Math.max(1, Math.ceil(target / (duration / 16)))
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      setCount(start)
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

function StatCard({ color, icon: Icon, value, label }) {
  const animated = useCountUp(value)
  return (
    <div className={`stat-card ${color}`}>
      <div className={`stat-icon ${color}`}><Icon size={18} /></div>
      <div className="stat-value">{animated}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function ProgressRow({ label, value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:6 }}>
        <span style={{ color:'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily:"'DM Mono',monospace" }}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width:`${pct}%`, background:color }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isAdmin, isManager } = useAuth()
  const toast = useToast()
  const [tasks,   setTasks]   = useState([])
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [tasksRes, usersRes] = await Promise.allSettled([
          api.get('/tasks'),
          isManager() ? api.get('/users') : Promise.resolve(null),
        ])
        setTasks(tasksRes.value?.data?.data || tasksRes.value?.data || [])
        setUsers(usersRes.value?.data?.data || usersRes.value?.data || [])
      } catch { toast.error('Failed to load dashboard data') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const total      = tasks.length
  const pending    = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const completed  = tasks.filter(t => t.status === 'completed').length
  const critical   = tasks.filter(t => t.priority === 'critical').length

  const priorityCounts = {
    low:      tasks.filter(t => t.priority === 'low').length,
    medium:   tasks.filter(t => t.priority === 'medium').length,
    high:     tasks.filter(t => t.priority === 'high').length,
    critical: tasks.filter(t => t.priority === 'critical').length,
  }
  const maxP = Math.max(...Object.values(priorityCounts), 1)

  const priorityColors = { low:'var(--green)', medium:'var(--accent)', high:'var(--orange)', critical:'var(--red)' }

  if (loading) return (
    <Layout title="Dashboard">
      <div style={{ display:'flex', justifyContent:'center', padding:'80px' }}><Spinner size={32} /></div>
    </Layout>
  )

  return (
    <Layout title="Dashboard">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard color="blue"   icon={LayoutDashboard} value={total}      label="Total Tasks" />
        <StatCard color="yellow" icon={Clock}           value={pending}    label="Pending" />
        <StatCard color="blue"   icon={RefreshCw}       value={inProgress} label="In Progress" />
        <StatCard color="green"  icon={CheckCircle2}    value={completed}  label="Completed" />
        {isAdmin() && <StatCard color="red" icon={Users} value={users.length} label="Team Members" />}
        {critical > 0 && <StatCard color="red" icon={AlertTriangle} value={critical} label="Critical" />}
      </div>

      {/* Content grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}
           className="dashboard-grid">

        {/* Recent tasks table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <CheckCircle2 size={16} /> Recent Tasks
            </div>
            <Link to="/tasks" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th><th>Status</th><th>Priority</th><th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0,8).length === 0 ? (
                  <tr><td colSpan={4}>
                    <div className="empty-state" style={{ padding:'30px' }}>
                      <p>No tasks yet</p>
                    </div>
                  </td></tr>
                ) : tasks.slice(0,8).map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight:500, fontSize:'0.86rem', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.title}
                      </div>
                      {t.assignee_name && (
                        <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>
                          → {t.assignee_name}
                        </div>
                      )}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.78rem', color:'var(--text-muted)' }}>{formatDate(t.due_date)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Progress card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Task Progress</div>
            </div>
            <div className="card-body">
              <ProgressRow label="Completed"  value={completed}  total={total} color="var(--green)" />
              <ProgressRow label="In Progress" value={inProgress} total={total} color="var(--accent)" />
              <ProgressRow label="Pending"    value={pending}    total={total} color="var(--yellow)" />

              <div className="divider" />

              {/* Priority chart */}
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                By Priority
              </div>
              <div className="chart-bars">
                {Object.entries(priorityCounts).map(([p, c]) => (
                  <div
                    key={p}
                    className="chart-bar"
                    title={`${p}: ${c}`}
                    style={{ height: Math.max(8, (c/maxP)*80), background: priorityColors[p] }}
                  />
                ))}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                {Object.entries(priorityColors).map(([p, c]) => (
                  <div key={p} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem', color:'var(--text-muted)' }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:c }} />
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Logged In As</div>
            </div>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{
                  width:48, height:48, borderRadius:'50%',
                  background: avatarColor(user?.role),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem',
                  color:'#fff', flexShrink:0,
                }}>
                  {initials(user?.name)}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:'0.92rem' }}>{user?.name}</div>
                  <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', margin:'2px 0' }}>{user?.email}</div>
                  <RoleBadge role={user?.role || 'technician'} />
                </div>
              </div>
              {isManager() && (
                <>
                  <div className="divider" />
                  <Link to="/tasks" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                    <Plus size={15} /> Create New Task
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}