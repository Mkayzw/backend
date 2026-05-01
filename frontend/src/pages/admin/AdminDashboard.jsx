import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../../api/dashboard';
import { usersAPI } from '../../api/users';
import { assignmentsAPI } from '../../api/assignments';
import { alertsAPI } from '../../api/alerts';
import { metricsAPI } from '../../api/metrics';
import { patientsAPI } from '../../api/patients';
import { cliniciansAPI } from '../../api/clinicians';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import AlertCard from '../../components/AlertCard';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Users, UserCheck, Stethoscope, Link2, Bell, ShieldAlert, TrendingDown,
  FileHeart, BarChart3, Activity, Trash2, Plus, RefreshCw,
  Clock, AlertTriangle, Zap, Target, CheckCircle2, XCircle, UserCog
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import './AdminDashboard.css';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity, path: '/admin' },
  { key: 'users', label: 'Users', icon: UserCog, path: '/admin/users' },
  { key: 'assignments', label: 'Assignments', icon: Link2, path: '/admin/assignments' },
  { key: 'alerts', label: 'Alerts', icon: Bell, path: '/admin/alerts' },
  { key: 'metrics', label: 'System Metrics', icon: BarChart3, path: '/admin/metrics' },
];

const PATH_TO_TAB = {
  ...Object.fromEntries(TABS.map(t => [t.path, t.key])),
  '/admin/patients': 'overview',
  '/admin/clinicians': 'overview',
};
const CARE_CONTEXTS = ['GENERAL_REVIEW','ASTHMA_FOLLOWUP','POST_SURGERY_RECOVERY','CHRONIC_DISEASE_MONITORING','INFECTION_FOLLOWUP'];
const PIE_COLORS = ['#27AE60', '#2D9CDB', '#9B51E0'];

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => PATH_TO_TAB[location.pathname] || 'overview');

  // Sync tab with URL changes (e.g. sidebar navigation)
  useEffect(() => {
    const urlTab = PATH_TO_TAB[location.pathname];
    if (urlTab) {
      setTab(urlTab);
    }
  }, [location.pathname]);

  const handleTabChange = (tabKey) => {
    const tabDef = TABS.find(t => t.key === tabKey);
    if (tabDef) {
      setTab(tabKey);
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [aForm, setAForm] = useState({ patientId:'', clinicianId:'', careContext:'GENERAL_REVIEW', reason:'' });
  const [uFilter, setUFilter] = useState('ALL');

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setLoading(true);
    try {
      const statsData = await dashboardAPI.getStats();
      setStats(statsData);
    } catch(e) { console.error('Failed to load stats:', e); }
    try {
      const recentData = await dashboardAPI.getRecentActivity();
      setRecent(recentData);
    } catch(e) { console.error('Failed to load recent activity:', e); }
    try {
      const usersData = await usersAPI.getAll();
      setUsers(usersData);
    } catch(e) { console.error('Failed to load users:', e); }
    try {
      const assignmentsData = await assignmentsAPI.getAll();
      setAssignments(assignmentsData);
    } catch(e) { console.error('Failed to load assignments:', e); }
    try {
      const alertsData = await alertsAPI.getAll({limit:100});
      setAlerts(alertsData);
    } catch(e) { console.error('Failed to load alerts:', e); }
    try {
      const patientsData = await patientsAPI.getAll();
      setPatients(patientsData);
    } catch(e) { console.error('Failed to load patients:', e); }
    try {
      const cliniciansData = await cliniciansAPI.getAll();
      setClinicians(cliniciansData);
    } catch(e) { console.error('Failed to load clinicians:', e); }
    try {
      const [em,lm,rm] = await Promise.all([metricsAPI.getErrorRate(7),metricsAPI.getLatency(7),metricsAPI.getRiskAccuracy()]);
      setErrM(em); setLatM(lm); setRiskAcc(rm);
    } catch(e) { console.error('Failed to load metrics:', e); }
    setLoading(false);
  };

  const delUser = async(id)=>{ if(!confirm('Delete this user?'))return; try{await usersAPI.delete(id);setUsers(p=>p.filter(u=>u.id!==id));}catch(e){alert(e.message);} };
  const delAssign = async(id)=>{ if(!confirm('Delete?'))return; try{await assignmentsAPI.delete(id);setAssignments(p=>p.filter(a=>a.id!==id));}catch(e){alert(e.message);} };
  const toggleAssign = async(id,st)=>{ try{await assignmentsAPI.updateStatus(id,st==='ACTIVE'?'INACTIVE':'ACTIVE');setAssignments(p=>p.map(a=>a.id===id?{...a,status:st==='ACTIVE'?'INACTIVE':'ACTIVE'}:a));}catch(e){alert(e.message);} };
  const markRead = async(id)=>{ try{await alertsAPI.markRead(id);setAlerts(p=>p.map(a=>a.id===id?{...a,isRead:true}:a));}catch(e){console.error(e);} };

  const createAssign = async(e)=>{
    e.preventDefault();
    try{
      await assignmentsAPI.create({patientId:parseInt(aForm.patientId),clinicianId:parseInt(aForm.clinicianId),careContext:aForm.careContext,reason:aForm.reason||null});
      setShowModal(false); setAForm({patientId:'',clinicianId:'',careContext:'GENERAL_REVIEW',reason:''}); load();
    }catch(e){alert(e.message);}
  };

  const fUsers = uFilter==='ALL'?users:users.filter(u=>u.role===uFilter);
  const rc = {PATIENT:users.filter(u=>u.role==='PATIENT').length,CLINICIAN:users.filter(u=>u.role==='CLINICIAN').length,ADMIN:users.filter(u=>u.role==='ADMIN').length};
  const pieData = [{name:'Patients',value:rc.PATIENT},{name:'Clinicians',value:rc.CLINICIAN},{name:'Admins',value:rc.ADMIN}];

  if(loading) return(<><TopBar title="Admin Console" subtitle="System administration"/><div className="page-content flex-center" style={{height:'60vh'}}><LoadingSpinner/></div></>);

  return (
    <>
      <TopBar title="Admin Console" subtitle="System-wide monitoring & management" />
      <div className="page-content">
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
                    <div className="activity-dot activity-dot--report"/><div className="activity-content"><span className="activity-text">Symptom report submitted</span><span className="activity-meta">Patient #{r.patientId} — {r.severity} — Risk: {r.riskLevel}</span></div>
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
            <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14}/> Refresh</button>
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
            <tbody>{assignments.map((a,i)=><tr key={a.id} className="animate-fade-in" style={{animationDelay:`${i*20}ms`}}>
              <td className="table-id">{a.id}</td><td>Patient #{a.patientId}</td><td>Clinician #{a.clinicianId}</td>
              <td className="context-tag">{a.careContext?.replace(/_/g,' ')}</td>
              <td><span className={`badge ${a.status==='ACTIVE'?'badge-success':'badge-neutral'}`}>{a.status}</span></td>
              <td className="text-muted">{new Date(a.assignedAt).toLocaleDateString()}</td>
              <td><div style={{display:'flex',gap:4}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>toggleAssign(a.id,a.status)}>{a.status==='ACTIVE'?<XCircle size={14} style={{color:'var(--color-warning)'}}/>:<CheckCircle2 size={14} style={{color:'var(--color-success)'}}/>}</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>delAssign(a.id)}><Trash2 size={14} style={{color:'var(--color-danger)'}}/></button>
              </div></td>
            </tr>)}</tbody></table></div>
          <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Create Assignment" width={480}>
            <form onSubmit={createAssign} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div className="form-group"><label className="form-label">Patient</label><select className="form-select" value={aForm.patientId} onChange={e=>setAForm(f=>({...f,patientId:e.target.value}))} required><option value="">Select patient...</option>{patients.map(p=><option key={p.id} value={p.id}>#{p.id} — {p.user?.fullname||p.user?.fullName||`Patient ${p.id}`}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Clinician</label><select className="form-select" value={aForm.clinicianId} onChange={e=>setAForm(f=>({...f,clinicianId:e.target.value}))} required><option value="">Select clinician...</option>{clinicians.map(c=><option key={c.id} value={c.id}>#{c.id} — {c.fullName} ({c.specialization})</option>)}</select></div>
              <div className="form-group"><label className="form-label">Care Context</label><select className="form-select" value={aForm.careContext} onChange={e=>setAForm(f=>({...f,careContext:e.target.value}))}>{CARE_CONTEXTS.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Reason</label><input className="form-input" placeholder="Optional reason" value={aForm.reason} onChange={e=>setAForm(f=>({...f,reason:e.target.value}))}/></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%'}}><Plus size={16}/> Create</button>
            </form>
          </Modal>
        </div>)}

        {tab==='alerts' && (<div className="alerts-list">{alerts.length>0?alerts.map(a=><AlertCard key={a.id} alert={a} onMarkRead={markRead}/>):<div className="empty-state"><Bell size={36} className="empty-state-icon"/><p>No alerts</p></div>}</div>)}

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
