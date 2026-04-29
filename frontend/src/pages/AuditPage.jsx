import { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, FileText, X } from 'lucide-react'
import Layout from '../components/Layout'
import { Modal, Spinner, EmptyState } from '../components/UI'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { formatDateTime, timeAgo, actionType } from '../utils/helpers'

const PAGE = 20

export default function AuditPage() {
  const toast = useToast()
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [aFilter, setAFilter] = useState('')
  const [page,    setPage]    = useState(1)
  const [detail,  setDetail]  = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/audit-logs?limit=200')
      setLogs(data.data?.logs || data.logs || data.data || data || [])
    } catch { toast.error('Failed to load audit logs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => logs.filter(l => {
    if (aFilter && !l.action.includes(aFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      return `${l.action} ${l.resource||''} ${l.user_name||''} ${l.user_email||''} ${l.ip_address||''}`
        .toLowerCase().includes(q)
    }
    return true
  }), [logs, aFilter, search])

  const pages = Math.ceil(filtered.length / PAGE)
  const paged = filtered.slice((page-1)*PAGE, page*PAGE)

  const getActionClass = action => {
    const t = actionType(action)
    return `action-badge action-${t}`
  }

  const parseDetails = d => {
    try {
      const obj = typeof d === 'string' ? JSON.parse(d) : d
      return JSON.stringify(obj, null, 2)
    } catch { return String(d || '—') }
  }

  return (
    <Layout title="Audit Logs">
      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={15} className="search-box-icon" />
          <input
            className="search-input"
            placeholder="Search by action, user, resource…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="form-control" style={{ width:'auto', minWidth:160 }}
          value={aFilter} onChange={e => { setAFilter(e.target.value); setPage(1) }}>
          <option value="">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={16} /> System Audit Trail
            <span className="nav-badge">{filtered.length}</span>
          </div>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.72rem', color:'var(--text-muted)' }}>
            Click a row for details
          </span>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:50 }}><Spinner size={28} /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP Address</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={6}>
                    <EmptyState icon={FileText} title="No log entries" message="No activity matches your filters" />
                  </td></tr>
                ) : paged.map((log, i) => (
                  <tr key={log.id || i} style={{ cursor:'pointer' }} onClick={() => setDetail(log)}>
                    <td>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.76rem' }}>
                        {formatDateTime(log.created_at)}
                      </span>
                      <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                        {timeAgo(log.created_at)}
                      </div>
                    </td>
                    <td>
                      {log.user_name ? (
                        <>
                          <div style={{ fontSize:'0.84rem', fontWeight:500 }}>{log.user_name}</div>
                          <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{log.user_email}</div>
                        </>
                      ) : (
                        <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>System</span>
                      )}
                    </td>
                    <td><span className={getActionClass(log.action)}>{log.action}</span></td>
                    <td>
                      {log.resource ? (
                        <>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.76rem', color:'var(--text-secondary)' }}>
                            {log.resource}
                          </span>
                          {log.resource_id && (
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.66rem', color:'var(--text-muted)' }}>
                              {log.resource_id.slice(0,12)}…
                            </div>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.75rem', color:'var(--text-muted)' }}>
                        {log.ip_address || '—'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }}
                        onClick={e => { e.stopPropagation(); setDetail(log) }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <span>{(page-1)*PAGE+1}–{Math.min(page*PAGE, filtered.length)} of {filtered.length}</span>
            <div className="pagination-btns">
              {Array.from({ length: Math.min(pages, 8) }, (_,i) => (
                <button key={i} className={`page-btn ${page===i+1?'active':''}`} onClick={() => setPage(i+1)}>
                  {i+1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Log Entry Detail"
        maxWidth={500}
        footer={
          <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
        }
      >
        {detail && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[
                ['Timestamp',  formatDateTime(detail.created_at)],
                ['Action',     <span className={getActionClass(detail.action)}>{detail.action}</span>],
                ['User',       detail.user_name || 'System'],
                ['User Email', detail.user_email || '—'],
                ['Resource',   detail.resource   || '—'],
                ['IP Address', detail.ip_address  || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize:'0.84rem' }}>{value}</div>
                </div>
              ))}
            </div>

            {detail.resource_id && (
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
                  Resource ID
                </div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.74rem', wordBreak:'break-all', color:'var(--text-secondary)' }}>
                  {detail.resource_id}
                </div>
              </div>
            )}

            {detail.user_agent && (
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
                  User Agent
                </div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.7rem', color:'var(--text-muted)', wordBreak:'break-all' }}>
                  {detail.user_agent}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>
                Details Payload
              </div>
              <pre className="detail-pre">{parseDetails(detail.details)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}