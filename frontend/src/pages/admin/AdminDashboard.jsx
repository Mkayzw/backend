import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../api/dashboard';
import { usersAPI } from '../../api/users';
import { assignmentsAPI } from '../../api/assignments';
import { alertsAPI } from '../../api/alerts';
import { metricsAPI } from '../../api/metrics';
import { patientsAPI } from '../../api/patients';
import { cliniciansAPI } from '../../api/clinicians';
import { auditAPI } from '../../api/audit';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import AlertCard from '../../components/AlertCard';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import PushAlertsButton from '../../components/PushAlertsButton';
import { startRealtimeStream } from '../../realtime/sse';
import {
  Users, UserCheck, Stethoscope, Link2, Bell, ShieldAlert, TrendingDown,
  FileHeart, BarChart3, Activity, Trash2, Plus, RefreshCw,
  Clock, AlertTriangle, Zap, Target, CheckCircle2, XCircle, UserCog, History
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import './AdminDashboard.css';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity, path: '/admin' },
  { key: 'users', label: 'Users', icon: UserCog, path: '/admin/users' },
  { key: 'assignments', label: 'Assignments', icon: Link2, path: '/admin/assignments' },
  { key: 'alerts', label: 'Alerts', icon: Bell, path: '/admin/alerts' },
  { key: 'audit', label: 'Audit Trail', icon: History, path: '/admin/audit' },
  { key: 'metrics', label: 'System Metrics', icon: BarChart3, path: '/admin/metrics' },
];

const PATH_TO_TAB = {
  ...Object.fromEntries(TABS.map(t => [t.path, t.key])),
  '/admin/patients': 'overview',
  '/admin/clinicians': 'overview',
};
const CARE_CONTEXTS = [
  'GENERAL_REVIEW',
  'ASTHMA_FOLLOWUP',
  'POST_SURGERY_RECOVERY',
  'CHRONIC_DISEASE_MONITORING',
  'INFECTION_FOLLOWUP',
  'CARDIAC_FOLLOWUP',
  'DIABETES_MANAGEMENT',
  'HYPERTENSION_MONITORING',
  'MATERNAL_CARE',
  'MENTAL_HEALTH_FOLLOWUP',
  'PEDIATRIC_FOLLOWUP',
  'ONCOLOGY_FOLLOWUP',
  'RENAL_FOLLOWUP',
];
const PIE_COLORS = ['#27AE60', '#2D9CDB', '#9B51E0'];

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { setUnreadAlerts } = useNotifications();
  const tab = PATH_TO_TAB[location.pathname] || 'overview';

  const handleTabChange = (tabKey) => {
    const tabDef = TABS.find(t => t.key === tabKey);
    if (tabDef) {
      navigate(tabDef.path, { replace: true });
    }
  };
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [clinicians, setClinicians] = useState([]);
  const [errM, setErrM] = useState(null);
  const [latM, setLatM] = useState(null);
  const [riskAcc, setRiskAcc] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [aForm, setAForm] = useState({ patientId:'', clinicianId:'', careContext:'GENERAL_REVIEW', reason:'' });
  const [uFilter, setUFilter] = useState('ALL');
  const [uSearch, setUSearch] = useState('');
  const [pSearch, setPSearch] = useState('');
  const [cSearch, setCSearch] = useState('');
  const [auditResourceFilter, setAuditResourceFilter] = useState('ALL');

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const token = localStorage.getItem('rpm_token');
    if (!token) return;

    const stream = startRealtimeStream({
      token,
      onEvent: (evt) => {
        if (evt?.event !== 'alert.created') return;
        const incoming = evt?.data;
        if (!incoming?.id) return;

        setAlerts(prev => {
          const exists = prev.some(a => a.id === incoming.id);
          if (exists) return prev;
          const updated = [incoming, ...prev].slice(0, 100);
          const unreadCount = updated.filter(a => !a.isRead).length;
          setUnreadAlerts(unreadCount);
          setStats(s => s ? ({ ...s, unreadAlerts: unreadCount }) : s);
          if (incoming.priority === 'HIGH') success('New HIGH RISK alert received');
          return updated;
        });
      },
      onError: (e) => {
        console.warn('Realtime stream error', e);
      }
    });

    return () => stream.stop();
  }, [setUnreadAlerts, success]);

  async function load() {
    setLoading(true);
    try {
      const statsData = await dashboardAPI.getStats();
      setStats(statsData);
    } catch(e) { toastError('Failed to load stats: ' + (e.message || 'Unknown error')); }
    try {
      const recentData = await dashboardAPI.getRecentActivity();
      setRecent(recentData);
    } catch(e) { toastError('Failed to load recent activity: ' + (e.message || 'Unknown error')); }
    try {
      const usersData = await usersAPI.getAll();
      setUsers(usersData);
    } catch(e) { toastError('Failed to load users: ' + (e.message || 'Unknown error')); }
    try {
      const assignmentsData = await assignmentsAPI.getAll();
      setAssignments(assignmentsData);
    } catch(e) { toastError('Failed to load assignments: ' + (e.message || 'Unknown error')); }
    try {
      const alertsData = await alertsAPI.getAll({limit:100});
      setAlerts(alertsData);
      const unreadCount = (alertsData || []).filter(a => !a.isRead).length;
      setUnreadAlerts(unreadCount);
    } catch(e) { toastError('Failed to load alerts: ' + (e.message || 'Unknown error')); }
    try {
      const patientsData = await patientsAPI.getAll();
      setPatients(patientsData);
    } catch(e) { toastError('Failed to load patients: ' + (e.message || 'Unknown error')); }
    try {
      const cliniciansData = await cliniciansAPI.getAll();
      setClinicians(cliniciansData);
    } catch(e) { toastError('Failed to load clinicians: ' + (e.message || 'Unknown error')); }
    try {
      const [em,lm,rm] = await Promise.all([metricsAPI.getErrorRate(7),metricsAPI.getLatency(7),metricsAPI.getRiskAccuracy()]);
      setErrM(em); setLatM(lm); setRiskAcc(rm);
    } catch(e) { toastError('Failed to load metrics: ' + (e.message || 'Unknown error')); }
    try {
      const auditData = await auditAPI.getLogs({ limit: 100 });
      setAuditLogs(auditData);
    } catch(e) { toastError('Failed to load audit logs: ' + (e.message || 'Unknown error')); }
    setLoading(false);
  }

  const delUser = async(id)=>{ if(!confirm('Delete this user?'))return; try{await usersAPI.delete(id);setUsers(p=>p.filter(u=>u.id!==id)); success('User deleted');}catch(e){toastError('Failed to delete user: ' + (e.message || 'Unknown error'));} };
  const delAssign = async(id)=>{ if(!confirm('Delete?'))return; try{await assignmentsAPI.delete(id);setAssignments(p=>p.filter(a=>a.id!==id)); success('Assignment deleted');}catch(e){toastError('Failed to delete assignment: ' + (e.message || 'Unknown error'));} };
  const toggleAssign = async(id,st)=>{ try{await assignmentsAPI.updateStatus(id,st==='ACTIVE'?'INACTIVE':'ACTIVE');setAssignments(p=>p.map(a=>a.id===id?{...a,status:st==='ACTIVE'?'INACTIVE':'ACTIVE'}:a)); success('Assignment status updated');}catch(e){toastError('Failed to update assignment: ' + (e.message || 'Unknown error'));} };
  const markRead = async(id)=>{ try{await alertsAPI.markRead(id);setAlerts(p=>{const updated=p.map(a=>a.id===id?{...a,isRead:true}:a); setUnreadAlerts(updated.filter(a=>!a.isRead).length); return updated;}); success('Alert marked as read');}catch(e){toastError('Failed to mark alert read: ' + (e.message || 'Unknown error'));} };

  const createAssign = async(e)=>{
    e.preventDefault();
    try{
      await assignmentsAPI.create({patientId:parseInt(aForm.patientId),clinicianId:parseInt(aForm.clinicianId),careContext:aForm.careContext,reason:aForm.reason||null});
      setShowModal(false); setAForm({patientId:'',clinicianId:'',careContext:'GENERAL_REVIEW',reason:''}); success('Assignment created'); load();
    }catch(e){toastError('Failed to create assignment: ' + (e.message || 'Unknown error'));}
  };

  const fUsers = (uFilter==='ALL'?users:users.filter(u=>u.role===uFilter))
    .filter(u => {
      const term = uSearch.toLowerCase();
      if (!term) return true;
      return (u.fullname || u.fullName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
    });
  const rc = {PATIENT:users.filter(u=>u.role==='PATIENT').length,CLINICIAN:users.filter(u=>u.role==='CLINICIAN').length,ADMIN:users.filter(u=>u.role==='ADMIN').length};
  const pieData = [{name:'Patients',value:rc.PATIENT},{name:'Clinicians',value:rc.CLINICIAN},{name:'Admins',value:rc.ADMIN}];
  const auditResourceTypes = ['ALL', ...Array.from(new Set(auditLogs.map(l => l.resourceType).filter(Boolean)))];
  const filteredAuditLogs = auditResourceFilter === 'ALL'
    ? auditLogs
    : auditLogs.filter(l => l.resourceType === auditResourceFilter);

  if(loading) return(<><TopBar title="Admin Console" subtitle="System administration"/><div className="page-content flex-center" style={{height:'60vh'}}><LoadingSpinner/></div></>);

  return (
    <>
      <TopBar title="Admin Console" subtitle="System-wide monitoring & management" />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <PushAlertsButton />
        </div>
        <div className="tabs">
          {TABS.map(t=><button key={t.key} className={`tab ${tab===t.key?'active':''}`} onClick={()=>handleTabChange(t.key)}><t.icon size={15} style={{marginRight:6,verticalAlign:'middle'}}/> {t.label}</button>)}
        </div>

        {tab==='overview' && (<>
          <div className="stats-grid stagger-children">
            <StatCard icon={Users} label="Total Users" value={stats?.totalUsers||0} color="blue" delay={0}/>
            <StatCard icon={UserCheck} label="Patients" value={stats?.totalPatients||0} color="green" delay={60}/>
            <StatCard icon={Stethoscope} label="Clinicians" value={stats?.totalClinicians||0} color="teal" delay={120}/>
            <StatCard icon={Link2} label="Active Assignments" value={stats?.activeAssignments||0} color="blue" delay={180} subtitle={`${stats?.totalAssignments||0} total`}/>
            <StatCard icon={ShieldAlert} label="High Risk" value={stats?.highRiskPatients||0} color="red" delay={240}/>
            <StatCard icon={TrendingDown} label="Worsening" value={stats?.worseningPatients||0} color="amber" delay={300}/>
            <StatCard icon={Bell} label="Unread Alerts" value={stats?.unreadAlerts||0} color="red" delay={360}/>
            <StatCard icon={FileHeart} label="Reports Today" value={stats?.reportsToday||0} color="teal" delay={420}/>
          </div>
          <div className="admin-grid mt-24">
            <div className="card" style={{padding:24}}>
              <h3 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><Users size={18} style={{color:'var(--color-blue)'}}/> User Distribution</h3>
              <div className="flex-center" style={{height:220}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={pieData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">{pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}</Pie><Tooltip contentStyle={{background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:10,fontSize:'0.82rem'}}/></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pie-legend">{pieData.map((d,i)=><div key={d.name} className="pie-legend-item"><div className="pie-legend-dot" style={{background:PIE_COLORS[i]}}/><span>{d.name}: {d.value}</span></div>)}</div>
            </div>
            <div className="card" style={{padding:24}}>
              <h3 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><Clock size={18} style={{color:'var(--color-teal)'}}/> Recent Activity</h3>
              <div className="activity-feed">
                {recent?.recentSymptomReports?.slice(0,5).map((r,i)=>(
                  <div key={r.id} className="activity-item animate-fade-in" style={{animationDelay:`${i*60}ms`}}>
                    <div className="activity-dot activity-dot--report"/><div className="activity-content"><span className="activity-text">Symptom report submitted</span><span className="activity-meta">{r.patient?.user?.fullname || r.patient?.user?.fullName || `Patient #${r.patientId}`} — {r.severity} — Risk: {r.riskLevel}</span></div>
                    <span className="activity-time">{new Date(r.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                  </div>
                ))}
                {recent?.recentUsers?.slice(0,3).map((u,i)=>(
                  <div key={u.id} className="activity-item animate-fade-in" style={{animationDelay:`${(i+5)*60}ms`}}>
                    <div className="activity-dot activity-dot--user"/><div className="activity-content"><span className="activity-text">New user registered</span><span className="activity-meta">{u.fullname||u.email} — {u.role}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>)}

        {tab==='users' && (<div>
          <div className="flex-between mb-16">
            <div className="alert-filters">{['ALL','PATIENT','CLINICIAN','ADMIN'].map(f=><button key={f} className={`btn btn-sm ${uFilter===f?'btn-primary':'btn-secondary'}`} onClick={()=>setUFilter(f)}>{f} {f!=='ALL'&&`(${rc[f]||0})`}</button>)}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input className="form-input" placeholder="Search users..." value={uSearch} onChange={e=>setUSearch(e.target.value)} style={{width:220}}/>
              <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
            </div>
          </div>
          <div className="card" style={{overflow:'hidden'}}><table className="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>{fUsers.map((u,i)=><tr key={u.id} className="animate-fade-in" style={{animationDelay:`${i*20}ms`}}>
              <td className="table-id">{u.id}</td><td className="table-name">{u.fullname||u.fullName||'—'}</td><td>{u.email}</td>
              <td><span className={`badge ${u.role==='ADMIN'?'badge-info':u.role==='CLINICIAN'?'badge-warning':'badge-success'}`}>{u.role}</span></td>
              <td className="text-muted">{u.phone||'—'}</td>
              <td><button className="btn btn-ghost btn-sm" onClick={()=>delUser(u.id)}><Trash2 size={14} style={{color:'var(--color-danger)'}}/></button></td>
            </tr>)}</tbody></table></div>
        </div>)}

        {tab==='assignments' && (<div>
          <div className="flex-between mb-16"><span className="section-title" style={{margin:0}}>{assignments.length} Total Assignments</span><button className="btn btn-primary btn-sm" onClick={()=>setShowModal(true)}><Plus size={14}/> New Assignment</button></div>
          <div className="card" style={{overflow:'hidden'}}><table className="admin-table"><thead><tr><th>ID</th><th>Patient</th><th>Clinician</th><th>Context</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>{assignments.map((a,i)=>{
              const pData = a.patient || patients.find(p => p.id === a.patientId);
              const pName = pData?.user?.fullname || pData?.user?.fullName || pData?.user?.email || `Patient #${a.patientId}`;
              const cData = a.clinician || clinicians.find(c => c.id === a.clinicianId);
              const cName = cData?.fullName || cData?.user?.fullname || cData?.user?.fullName || `Clinician #${a.clinicianId}`;
              return (
            <tr key={a.id} className="animate-fade-in" style={{animationDelay:`${i*20}ms`}}>
              <td className="table-id">{a.id}</td><td>{pName}</td><td>{cName}</td>
              <td className="context-tag">{a.careContext?.replace(/_/g,' ')}</td>
              <td><span className={`badge ${a.status==='ACTIVE'?'badge-success':'badge-neutral'}`}>{a.status}</span></td>
              <td className="text-muted">{new Date(a.assignedAt).toLocaleDateString()}</td>
              <td><div style={{display:'flex',gap:4}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>toggleAssign(a.id,a.status)}>{a.status==='ACTIVE'?<XCircle size={14} style={{color:'var(--color-warning)'}}/>:<CheckCircle2 size={14} style={{color:'var(--color-success)'}}/>}</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>delAssign(a.id)}><Trash2 size={14} style={{color:'var(--color-danger)'}}/></button>
              </div></td>
            </tr>)})}</tbody></table></div>
          <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Create Assignment" width={480}>
            <form onSubmit={createAssign} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div className="form-group"><label className="form-label">Patient</label><input className="form-input" placeholder="Search patients..." value={pSearch} onChange={e=>setPSearch(e.target.value)} style={{marginBottom:8}}/><select className="form-select" value={aForm.patientId} onChange={e=>setAForm(f=>({...f,patientId:e.target.value}))} required><option value="">Select patient...</option>{patients.filter(p=>{const t=pSearch.toLowerCase();if(!t)return true;const n=(p.user?.fullname||p.user?.fullName||'').toLowerCase();const em=(p.user?.email||'').toLowerCase();return n.includes(t)||em.includes(t)||String(p.id).includes(t);}).map(p=><option key={p.id} value={p.id}>#{p.id} — {p.user?.fullname||p.user?.fullName||`Patient ${p.id}`}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Clinician</label><input className="form-input" placeholder="Search clinicians..." value={cSearch} onChange={e=>setCSearch(e.target.value)} style={{marginBottom:8}}/><select className="form-select" value={aForm.clinicianId} onChange={e=>setAForm(f=>({...f,clinicianId:e.target.value}))} required><option value="">Select clinician...</option>{clinicians.filter(c=>{const t=cSearch.toLowerCase();if(!t)return true;const n=(c.fullName||'').toLowerCase();const sp=(c.specialization||'').toLowerCase();return n.includes(t)||sp.includes(t)||String(c.id).includes(t);}).map(c=><option key={c.id} value={c.id}>#{c.id} — {c.fullName} ({c.specialization})</option>)}</select></div>
              <div className="form-group"><label className="form-label">Care Context</label><select className="form-select" value={aForm.careContext} onChange={e=>setAForm(f=>({...f,careContext:e.target.value}))}>{CARE_CONTEXTS.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Reason</label><input className="form-input" placeholder="Optional reason" value={aForm.reason} onChange={e=>setAForm(f=>({...f,reason:e.target.value}))}/></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%'}}><Plus size={16}/> Create</button>
            </form>
          </Modal>
        </div>)}

        {tab==='alerts' && (<div className="alerts-list">{alerts.length>0?alerts.map(a=><AlertCard key={a.id} alert={a} onMarkRead={markRead}/>):<div className="empty-state"><Bell size={36} className="empty-state-icon"/><p>No alerts</p></div>}</div>)}

        {tab==='audit' && (<div>
          <div className="flex-between mb-16">
            <span className="section-title" style={{margin:0}}>System Audit Trail</span>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <select className="form-select" value={auditResourceFilter} onChange={e=>setAuditResourceFilter(e.target.value)} style={{width:190}}>
                {auditResourceTypes.map(type => <option key={type} value={type}>{type === 'ALL' ? 'All resources' : type.replace(/_/g, ' ')}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
            </div>
          </div>
          <div className="card" style={{overflow:'hidden'}}>
            <table className="admin-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Status</th><th>IP</th></tr></thead>
              <tbody>{filteredAuditLogs.map((log,i)=><tr key={log.id} className="animate-fade-in" style={{animationDelay:`${i*15}ms`}}>
                <td className="text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.actor?.fullname || log.actor?.fullName || (log.actorUserId ? `User #${log.actorUserId}` : 'Anonymous')}<div className="text-muted" style={{fontSize:'0.75rem'}}>{log.actorRole || 'N/A'}</div></td>
                <td><span className="badge badge-info">{log.action.replace(/_/g,' ')}</span><div className="text-muted" style={{fontSize:'0.75rem'}}>{log.method} {log.path}</div></td>
                <td>{log.resourceType?.replace(/_/g,' ') || 'resource'}{log.resourceId && <div className="text-muted" style={{fontSize:'0.75rem'}}>ID: {log.resourceId}</div>}</td>
                <td><span className={`badge ${log.statusCode >= 400 ? 'badge-danger' : 'badge-success'}`}>{log.statusCode}</span></td>
                <td className="text-muted">{log.ipAddress || '—'}</td>
              </tr>)}</tbody>
            </table>
            {filteredAuditLogs.length === 0 && <div className="empty-state"><History size={36} className="empty-state-icon"/><p>No audit events recorded yet</p></div>}
          </div>
        </div>)}

        {tab==='metrics' && (<div>
          <div className="admin-grid">
            <div className="card" style={{padding:24}}>
              <h3 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><AlertTriangle size={18} style={{color:'var(--color-danger)'}}/> Error Rate</h3>
              {errM?<div className="metrics-stats"><div className="metric-value-large">{typeof errM.error_rate==='number'?errM.error_rate.toFixed(2)+'%':'N/A'}</div><p className="text-muted" style={{fontSize:'0.82rem'}}>{errM.total_requests||0} total requests | {errM.error_count||0} errors</p></div>:<div className="empty-state"><p>Unavailable</p></div>}
            </div>
            <div className="card" style={{padding:24}}>
              <h3 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><Zap size={18} style={{color:'var(--color-warning)'}}/> Latency</h3>
              {latM?<div className="metrics-stats"><div className="latency-grid">
                <div className="latency-item"><span className="latency-label">P50</span><span className="latency-val">{latM.p50?.toFixed(0)||'—'}ms</span></div>
                <div className="latency-item"><span className="latency-label">P95</span><span className="latency-val">{latM.p95?.toFixed(0)||'—'}ms</span></div>
                <div className="latency-item"><span className="latency-label">P99</span><span className="latency-val">{latM.p99?.toFixed(0)||'—'}ms</span></div>
                <div className="latency-item"><span className="latency-label">Avg</span><span className="latency-val">{latM.average?.toFixed(0)||'—'}ms</span></div>
              </div></div>:<div className="empty-state"><p>Unavailable</p></div>}
            </div>
          </div>
          <div className="card mt-24" style={{padding:24}}>
            <h3 className="section-title" style={{display:'flex',alignItems:'center',gap:8}}><Target size={18} style={{color:'var(--color-success)'}}/> Risk Classification</h3>
            {riskAcc?<div className="risk-accuracy-grid">{Object.entries(riskAcc).slice(0,6).map(([k,v])=><div key={k} className="risk-accuracy-item"><span className="risk-accuracy-label">{k.replace(/_/g,' ')}</span><span className="risk-accuracy-value">{typeof v==='number'?v.toFixed(2):JSON.stringify(v)}</span></div>)}</div>:<div className="empty-state"><p>Unavailable</p></div>}
          </div>
        </div>)}
      </div>
    </>
  );
}
