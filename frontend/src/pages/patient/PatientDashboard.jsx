import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../api/dashboard';
import { symptomReportsAPI } from '../../api/symptomReports';
import { patientsAPI } from '../../api/patients';
import { assignmentsAPI } from '../../api/assignments';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import RiskBadge from '../../components/RiskBadge';
import TrendIndicator from '../../components/TrendIndicator';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Heart, Activity, Shield, Stethoscope, FileHeart, Clock, Thermometer,
  HeartPulse, Pill, Send, Plus, ClipboardList, Calendar, AlertCircle,
  LayoutDashboard
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './PatientDashboard.css';

const VALID_SYMPTOMS = [
  'chest_pain', 'difficulty_breathing', 'shortness_of_breath', 'severe_bleeding',
  'unconscious', 'stroke_symptoms', 'high_fever', 'persistent_vomiting',
  'severe_pain', 'confusion', 'fainting', 'rapid_heartbeat', 'fever', 'cough',
  'headache', 'nausea', 'dizziness', 'fatigue', 'back_pain', 'joint_pain',
  'abdominal_pain', 'muscle_weakness', 'swelling', 'rash',
];

const PATIENT_TABS = [
  { key: 'dashboard', path: '/patient' },
  { key: 'report', path: '/patient/report' },
  { key: 'clinicians', path: '/patient/clinicians' },
  { key: 'history', path: '/patient/history' },
];
const PATIENT_PATH_TO_TAB = Object.fromEntries(PATIENT_TABS.map(t => [t.path, t.key]));

export default function PatientDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => PATIENT_PATH_TO_TAB[location.pathname] || 'dashboard');
  const [showReportModal, setShowReportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({
    symptoms: [], severity: 'MILD', durationDays: 1, frequency: 'FIRST_TIME',
    notes: '', temperature: '', heartRate: '', medicationAdherent: null,
  });

  // Sync tab with URL changes (e.g. sidebar navigation)
  useEffect(() => {
    const urlTab = PATIENT_PATH_TO_TAB[location.pathname];
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [location.pathname]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const tabPath = tabKey === 'dashboard' ? '/patient' : `/patient/${tabKey}`;
    navigate(tabPath, { replace: true });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let patientsData = [];
      let allAssignments = [];
      try {
        patientsData = await patientsAPI.getAll();
      } catch (err) { console.error('Failed to load patients:', err); }
      try {
        allAssignments = await assignmentsAPI.getAll();
      } catch (err) { console.error('Failed to load assignments:', err); }

      const myPatient = patientsData.find(p => p.userId === user.id);
      setPatient(myPatient);

      if (myPatient) {
        try {
          const myReports = await symptomReportsAPI.getByPatient(myPatient.id);
          setReports(myReports);
        } catch (err) { console.error('Failed to load reports:', err); }
        const myAssignments = allAssignments.filter(a => a.patientId === myPatient.id && a.status === 'ACTIVE');
        setAssignments(myAssignments);
      }
    } catch (err) {
      console.error('Failed to load patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptom) => {
    setReportForm(f => ({
      ...f,
      symptoms: f.symptoms.includes(symptom)
        ? f.symptoms.filter(s => s !== symptom)
        : [...f.symptoms, symptom],
    }));
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!patient || reportForm.symptoms.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        patientId: patient.id,
        symptoms: reportForm.symptoms,
        severity: reportForm.severity,
        durationDays: parseInt(reportForm.durationDays),
        frequency: reportForm.frequency,
        notes: reportForm.notes || null,
        temperature: reportForm.temperature ? parseFloat(reportForm.temperature) : null,
        heartRate: reportForm.heartRate ? parseInt(reportForm.heartRate) : null,
        medicationAdherent: reportForm.medicationAdherent,
      };
      await symptomReportsAPI.create(payload);
      setShowReportModal(false);
      setReportForm({
        symptoms: [], severity: 'MILD', durationDays: 1, frequency: 'FIRST_TIME',
        notes: '', temperature: '', heartRate: '', medicationAdherent: null,
      });
      loadData();
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatSymptom = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const chartData = [...reports]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-10)
    .map(r => ({
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      riskScore: r.riskScore,
      severity: r.severity === 'CRITICAL' ? 4 : r.severity === 'SEVERE' ? 3 : r.severity === 'MODERATE' ? 2 : 1,
    }));

  if (loading) {
    return (
      <>
        <TopBar title="My Health Dashboard" subtitle="Personal health overview" />
        <div className="page-content flex-center" style={{ height: '60vh' }}>
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="My Health Dashboard" subtitle={`Welcome back, ${user?.fullName || 'Patient'}`} />
      <div className="page-content">
        {/* Tab Navigation */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
            <LayoutDashboard size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Dashboard
          </button>
          <button className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => handleTabChange('report')}>
            <FileHeart size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Report Symptoms
          </button>
          <button className={`tab ${activeTab === 'clinicians' ? 'active' : ''}`} onClick={() => handleTabChange('clinicians')}>
            <Stethoscope size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> My Clinicians
          </button>
          <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleTabChange('history')}>
            <ClipboardList size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> My Reports
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (<>
        {/* Stats Grid */}
        <div className="stats-grid stagger-children">
          <StatCard
            icon={Shield}
            label="Risk Level"
            value={patient?.currentRiskLevel || 'LOW'}
            color={patient?.currentRiskLevel === 'HIGH' ? 'red' : patient?.currentRiskLevel === 'MEDIUM' ? 'amber' : 'green'}
            delay={0}
          />
          <StatCard
            icon={Activity}
            label="Trend Status"
            value={patient?.currentTrendStatus || 'STABLE'}
            color={patient?.currentTrendStatus === 'WORSENING' ? 'red' : patient?.currentTrendStatus === 'IMPROVING' ? 'green' : 'blue'}
            delay={80}
          />
          <StatCard
            icon={ClipboardList}
            label="Total Reports"
            value={reports.length}
            color="teal"
            delay={160}
          />
          <StatCard
            icon={Stethoscope}
            label="Active Clinicians"
            value={assignments.length}
            color="blue"
            delay={240}
          />
        </div>

        {/* Charts + Timeline */}
        <div className="patient-grid mt-24">
          {/* Risk Score Chart */}
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} style={{ color: 'var(--color-teal)' }} /> Risk Score Trend
            </h3>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                  <XAxis dataKey="date" fontSize={12} stroke="var(--color-text-muted)" />
                  <YAxis fontSize={12} stroke="var(--color-text-muted)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      borderRadius: 10, fontSize: '0.82rem', boxShadow: 'var(--shadow-md)'
                    }}
                  />
                  <Area type="monotone" dataKey="riskScore" stroke="var(--color-teal)" fill="url(#riskGrad)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-teal)' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>Not enough data for chart yet</p></div>
            )}
          </div>

          {/* My Clinicians */}
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={18} style={{ color: 'var(--color-blue)' }} /> My Clinicians
            </h3>
            {assignments.length > 0 ? (
              <div className="clinician-list">
                {assignments.map((a, idx) => {
                  const clinicianName = a.clinician?.fullName || a.clinician?.user?.fullname || a.clinician?.user?.email || `Clinician #${a.clinicianId}`;
                  return (
                  <div key={a.id} className="clinician-card animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="clinician-avatar">{clinicianName[0]?.toUpperCase()}</div>
                    <div className="clinician-info">
                      <span className="clinician-name">{clinicianName}</span>
                      <span className="clinician-context">{a.clinician?.specialization?.replace(/_/g, ' ')} · {a.careContext?.replace(/_/g, ' ')}</span>
                      {a.reason && <span className="clinician-reason">{a.reason}</span>}
                    </div>
                    <span className="badge badge-success">Active</span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Stethoscope size={32} className="empty-state-icon" />
                <p>No clinicians assigned yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card mt-24" style={{ padding: 24 }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileHeart size={18} style={{ color: 'var(--color-teal)' }} /> Recent Reports
          </h3>
          {reports.length > 0 ? (
            <div className="reports-list">
              {reports.slice(0, 5).map((r, idx) => {
                let symptoms = [];
                try { symptoms = JSON.parse(r.symptoms); } catch {}
                return (
                  <div key={r.id} className="report-row animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="report-date">
                      <Calendar size={14} />
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="report-symptoms">
                      {symptoms.slice(0, 3).map(s => (
                        <span key={s} className="badge badge-neutral">{formatSymptom(s)}</span>
                      ))}
                      {symptoms.length > 3 && <span className="badge badge-neutral">+{symptoms.length - 3}</span>}
                    </div>
                    <span className={`badge ${r.severity === 'CRITICAL' || r.severity === 'SEVERE' ? 'badge-danger' : r.severity === 'MODERATE' ? 'badge-warning' : 'badge-success'}`}>
                      {r.severity}
                    </span>
                    <RiskBadge level={r.riskLevel} />
                    <span className="report-score">Score: {r.riskScore?.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <FileHeart size={32} className="empty-state-icon" />
              <p>No reports submitted yet</p>
            </div>
          )}
        </div>
        </>)}

        {/* Report Symptoms Tab */}
        {activeTab === 'report' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Plus size={18} style={{ color: 'var(--color-teal)' }} /> Report New Symptoms
            </h3>
            <form onSubmit={handleSubmitReport} className="report-form">
              <div className="form-group">
                <label className="form-label">Symptoms (select all that apply)</label>
                <div className="symptom-grid">
                  {VALID_SYMPTOMS.map(s => (
                    <button
                      key={s} type="button"
                      className={`symptom-chip ${reportForm.symptoms.includes(s) ? 'symptom-chip--active' : ''}`}
                      onClick={() => toggleSymptom(s)}
                    >
                      {formatSymptom(s)}
                    </button>
                  ))}
                </div>
                {reportForm.symptoms.length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                    <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Select at least one symptom
                  </span>
                )}
              </div>
              <div className="report-form-row">
                <div className="form-group">
                  <label className="form-label">Severity</label>
                  <select className="form-select" value={reportForm.severity} onChange={e => setReportForm(f => ({ ...f, severity: e.target.value }))}>
                    <option value="MILD">Mild</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (days)</label>
                  <input type="number" className="form-input" min="1" value={reportForm.durationDays} onChange={e => setReportForm(f => ({ ...f, durationDays: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select className="form-select" value={reportForm.frequency} onChange={e => setReportForm(f => ({ ...f, frequency: e.target.value }))}>
                    <option value="FIRST_TIME">First Time</option>
                    <option value="RECURRING">Recurring</option>
                    <option value="CHRONIC">Chronic</option>
                  </select>
                </div>
              </div>
              <div className="report-form-row">
                <div className="form-group">
                  <label className="form-label"><Thermometer size={13} /> Temperature (\u00b0C)</label>
                  <input type="number" step="0.1" className="form-input" placeholder="e.g. 37.5" value={reportForm.temperature} onChange={e => setReportForm(f => ({ ...f, temperature: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label"><HeartPulse size={13} /> Heart Rate (bpm)</label>
                  <input type="number" className="form-input" placeholder="e.g. 80" value={reportForm.heartRate} onChange={e => setReportForm(f => ({ ...f, heartRate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label"><Pill size={13} /> Medication Adherent</label>
                  <select className="form-select" value={reportForm.medicationAdherent === null ? '' : reportForm.medicationAdherent} onChange={e => setReportForm(f => ({ ...f, medicationAdherent: e.target.value === '' ? null : e.target.value === 'true' }))}>
                    <option value="">Not applicable</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-input" rows="3" placeholder="Describe how you're feeling..." value={reportForm.notes} onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting || reportForm.symptoms.length === 0} style={{ width: '100%', marginTop: 8 }}>
                {submitting ? 'Submitting...' : <><Send size={16} /> Submit Report</>}
              </button>
            </form>
          </div>
        )}

        {/* My Clinicians Tab */}
        {activeTab === 'clinicians' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={18} style={{ color: 'var(--color-blue)' }} /> My Clinicians
            </h3>
            {assignments.length > 0 ? (
              <div className="clinician-list">
                {assignments.map((a, idx) => {
                  const clinicianName = a.clinician?.fullName || a.clinician?.user?.fullname || a.clinician?.user?.email || `Clinician #${a.clinicianId}`;
                  return (
                  <div key={a.id} className="clinician-card animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="clinician-avatar">{clinicianName[0]?.toUpperCase()}</div>
                    <div className="clinician-info">
                      <span className="clinician-name">{clinicianName}</span>
                      <span className="clinician-context">{a.clinician?.specialization?.replace(/_/g, ' ')} · {a.careContext?.replace(/_/g, ' ')}</span>
                      {a.reason && <span className="clinician-reason">{a.reason}</span>}
                    </div>
                    <span className="badge badge-success">Active</span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Stethoscope size={36} className="empty-state-icon" />
                <p>No clinicians assigned yet</p>
              </div>
            )}
          </div>
        )}

        {/* My Reports Tab */}
        {activeTab === 'history' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={18} style={{ color: 'var(--color-teal)' }} /> My Reports
            </h3>
            {reports.length > 0 ? (
              <div className="reports-list">
                {reports.map((r, idx) => {
                  let symptoms = [];
                  try { symptoms = JSON.parse(r.symptoms); } catch {}
                  return (
                    <div key={r.id} className="report-row animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="report-date">
                        <Calendar size={14} />
                        {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="report-symptoms">
                        {symptoms.slice(0, 3).map(s => (
                          <span key={s} className="badge badge-neutral">{formatSymptom(s)}</span>
                        ))}
                        {symptoms.length > 3 && <span className="badge badge-neutral">+{symptoms.length - 3}</span>}
                      </div>
                      <span className={`badge ${r.severity === 'CRITICAL' || r.severity === 'SEVERE' ? 'badge-danger' : r.severity === 'MODERATE' ? 'badge-warning' : 'badge-success'}`}>
                        {r.severity}
                      </span>
                      <RiskBadge level={r.riskLevel} />
                      <span className="report-score">Score: {r.riskScore?.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <ClipboardList size={36} className="empty-state-icon" />
                <p>No reports submitted yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
