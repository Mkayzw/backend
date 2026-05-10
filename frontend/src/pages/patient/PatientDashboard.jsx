import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import { symptomReportsAPI } from '../../api/symptomReports';
import { patientsAPI } from '../../api/patients';
import { assignmentsAPI } from '../../api/assignments';
import { usersAPI } from '../../api/users';
import { followupResponsesAPI } from '../../api/followupResponses';
import { followupAppointmentsAPI } from '../../api/followupAppointments';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import RiskBadge from '../../components/RiskBadge';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Heart, Activity, Shield, Stethoscope, FileHeart, Clock, Thermometer,
  HeartPulse, Pill, Send, Plus, ClipboardList, Calendar, AlertCircle,
  LayoutDashboard, UserCircle, MessageSquare, AlertTriangle, CalendarPlus, CheckCircle2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './PatientDashboard.css';

const COMMON_CONDITIONS = [
  'asthma', 'copd', 'diabetes', 'hypertension', 'heart_disease', 'epilepsy',
  'chronic_kidney_disease', 'cancer', 'pregnancy', 'immunocompromised',
  'mental_health', 'stroke_history',
];

const VALID_SYMPTOMS = [
  // Critical
  'chest_pain', 'difficulty_breathing', 'shortness_of_breath', 'severe_bleeding',
  'unconscious', 'stroke_symptoms', 'seizure', 'severe_allergic_reaction',
  'suicidal_ideation', 'severe_dehydration', 'blue_lips_or_face',
  // High
  'high_fever', 'persistent_vomiting', 'severe_pain', 'confusion', 'fainting',
  'rapid_heartbeat', 'severe_headache', 'blood_in_stool', 'blood_in_urine',
  'coughing_blood', 'vomiting_blood', 'jaundice', 'vision_loss', 'slurred_speech',
  'severe_diarrhea', 'low_blood_sugar', 'high_blood_pressure',
  // Moderate
  'fever', 'cough', 'headache', 'nausea', 'vomiting', 'diarrhea', 'dizziness',
  'fatigue', 'back_pain', 'joint_pain', 'abdominal_pain', 'muscle_weakness',
  'swelling', 'rash', 'sore_throat', 'ear_pain', 'chills', 'night_sweats',
  'weight_loss', 'loss_of_appetite', 'numbness', 'tingling', 'burning_urination',
  'frequent_urination', 'constipation', 'bloating', 'anxiety', 'depression',
  'insomnia', 'palpitations',
  // Low
  'runny_nose', 'sneezing',
];

const PATIENT_TABS = [
  { key: 'dashboard', path: '/patient' },
  { key: 'report', path: '/patient/report' },
  { key: 'clinicians', path: '/patient/clinicians' },
  { key: 'history', path: '/patient/history' },
  { key: 'profile', path: '/patient/profile' },
];
const PATIENT_PATH_TO_TAB = Object.fromEntries(PATIENT_TABS.map(t => [t.path, t.key]));

// Calculate age from dateOfBirth
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { setUnreadAlerts } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeTab = PATIENT_PATH_TO_TAB[location.pathname] || 'dashboard';
  const [showReportModal, setShowReportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({
    symptoms: [], severity: 'MILD', durationDays: 1, frequency: 'FIRST_TIME',
    notes: '', temperature: '', heartRate: '', medicationAdherent: null,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    dateOfBirth: '',
    gender: '',
    phone: '',
    emergencyContact: '',
    address: '',
    chronicConditions: [],
    allergies: '',
    baselineStatus: 'stable'
  });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savingEscalation, setSavingEscalation] = useState(false);
  const [followUpResponses, setFollowUpResponses] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const handleTabChange = (tabKey) => {
    const tabPath = tabKey === 'dashboard' ? '/patient' : `/patient/${tabKey}`;
    navigate(tabPath, { replace: true });
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let patientsData = [];
      let allAssignments = [];
      try {
        patientsData = await patientsAPI.getAll();
      } catch (err) {
        toastError('Failed to load patients: ' + (err.message || 'Unknown error'));
      }
      try {
        allAssignments = await assignmentsAPI.getAll();
      } catch (err) {
        toastError('Failed to load assignments: ' + (err.message || 'Unknown error'));
      }

      const myPatient = patientsData.find(p => p.userId === user.id);
      setPatient(myPatient);

      if (myPatient) {
        let chronic = [];
        try { chronic = myPatient.chronicConditions ? JSON.parse(myPatient.chronicConditions) : []; } catch(e){}
        let algs = [];
        try { algs = myPatient.allergies ? JSON.parse(myPatient.allergies) : []; } catch(e){}
        
        setProfileForm({
          dateOfBirth: myPatient.dateOfBirth ? new Date(myPatient.dateOfBirth).toISOString().split('T')[0] : '',
          gender: myPatient.gender || '',
          phone: myPatient.user?.phone || '',
          emergencyContact: myPatient.emergencyContact || '',
          address: myPatient.address || '',
          chronicConditions: chronic,
          allergies: algs.join(', '),
          baselineStatus: myPatient.baselineStatus || 'stable'
        });

        try {
          const myReports = await symptomReportsAPI.getByPatient(myPatient.id);
          setReports(myReports);
        } catch (err) {
          toastError('Failed to load reports: ' + (err.message || 'Unknown error'));
        }
        try {
          const myResponses = await followupResponsesAPI.listForPatient(myPatient.id);
          setFollowUpResponses(myResponses);
        } catch (err) { /* best-effort */ }
        try {
          const myAppts = await followupAppointmentsAPI.list({ patientId: myPatient.id });
          setAppointments(myAppts);
        } catch (err) { /* best-effort */ }
        const myAssignments = allAssignments.filter(a => a.patientId === myPatient.id && a.status === 'ACTIVE');
        setAssignments(myAssignments);
      }
    } catch (err) {
      toastError('Failed to load patient data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

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
      success('Symptom report submitted successfully');
      loadData();
    } catch (err) {
      toastError('Failed to submit report: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!patient) return;
    setSavingProfile(true);
    try {
      await Promise.all([
        patientsAPI.update(patient.id, {
          dateOfBirth: profileForm.dateOfBirth,
          gender: profileForm.gender,
          emergencyContact: profileForm.emergencyContact,
          address: profileForm.address,
          chronicConditions: profileForm.chronicConditions,
          allergies: profileForm.allergies.split(',').map(a => a.trim()).filter(a => a),
          baselineStatus: profileForm.baselineStatus
        }),
        usersAPI.update(user.id, { phone: profileForm.phone || null }),
      ]);
      success('Profile updated successfully');
      loadData();
    } catch (err) {
      toastError('Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConditionToggle = (condition) => {
    setProfileForm(f => ({
      ...f,
      chronicConditions: f.chronicConditions.includes(condition)
        ? f.chronicConditions.filter(c => c !== condition)
        : [...f.chronicConditions, condition]
    }));
  };

  const formatSymptom = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await symptomReportsAPI.create({
        patientId: patient.id,
        symptoms: ['general_note'],
        severity: 'MILD',
        durationDays: 0,
        frequency: 'FIRST_TIME',
        notes: noteText,
      });
      success('Note saved successfully');
      setShowNoteModal(false);
      setNoteText('');
      loadData();
    } catch (err) {
      toastError('Failed to save note: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingNote(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalationReason.trim()) return;
    setSavingEscalation(true);
    try {
      await symptomReportsAPI.create({
        patientId: patient.id,
        symptoms: ['escalation_request'],
        severity: 'SEVERE',
        durationDays: 0,
        frequency: 'FIRST_TIME',
        notes: `ESCALATION REQUEST: ${escalationReason}`,
      });
      success('Escalation request submitted');
      setShowEscalationModal(false);
      setEscalationReason('');
      loadData();
    } catch (err) {
      toastError('Failed to escalate: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingEscalation(false);
    }
  };

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
        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNoteModal(true)}>
            <MessageSquare size={14} /> Add Note
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowEscalationModal(true)}>
            <AlertTriangle size={14} /> Request Escalation
          </button>
        </div>

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
          <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
            <UserCircle size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Profile
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
          <div className="dashboard-grid">
            <StatCard icon={Heart} label="Current Risk" value={patient?.currentRiskLevel || 'LOW'} color={patient?.currentRiskLevel === 'HIGH' ? 'red' : patient?.currentRiskLevel === 'MEDIUM' ? 'orange' : 'green'} />
            <StatCard icon={UserCircle} label="Age" value={calculateAge(patient?.dateOfBirth) ? `${calculateAge(patient?.dateOfBirth)} years` : 'N/A'} color="blue" />
            <StatCard icon={Activity} label="Trend Status" value={patient?.currentTrendStatus || 'STABLE'} color={patient?.currentTrendStatus === 'WORSENING' ? 'red' : patient?.currentTrendStatus === 'IMPROVING' ? 'green' : 'blue'} />
            <StatCard icon={ClipboardList} label="Total Reports" value={reports.length} color="teal" />
            <StatCard icon={Stethoscope} label="Active Clinicians" value={assignments.length} color="blue" />
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

        {/* Upcoming Follow-Ups + Clinician Responses */}
        <div className="patient-grid mt-24">
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarPlus size={18} style={{ color: 'var(--color-blue)' }} /> Upcoming Follow-Ups
            </h3>
            {appointments.filter(a => a.status === 'SCHEDULED').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {appointments
                  .filter(a => a.status === 'SCHEDULED')
                  .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
                  .slice(0, 5)
                  .map(appt => {
                    const when = new Date(appt.scheduledAt);
                    const clinicianName = appt.clinician?.fullName
                      || appt.clinician?.user?.fullName
                      || `Clinician #${appt.clinicianId}`;
                    return (
                      <div key={appt.id} style={{
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid var(--color-border-light)',
                        background: 'var(--color-bg)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <strong style={{ fontSize: '0.88rem' }}>{appt.reason}</strong>
                          <span className="badge badge-info">SCHEDULED</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {when.toLocaleString()}
                          </span>
                          <span><Stethoscope size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {clinicianName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-state">
                <CalendarPlus size={28} className="empty-state-icon" />
                <p>No follow-ups scheduled</p>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} style={{ color: 'var(--color-teal)' }} /> Clinician Responses
            </h3>
            {followUpResponses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {followUpResponses.slice(0, 5).map(r => {
                  const clinicianName = r.clinician?.fullName
                    || r.clinician?.user?.fullName
                    || `Clinician #${r.clinicianId}`;
                  return (
                    <div key={r.id} style={{
                      padding: 12,
                      borderRadius: 10,
                      border: r.actionRequired ? '1px solid var(--color-danger)' : '1px solid var(--color-border-light)',
                      background: r.actionRequired ? 'var(--color-danger-light, #fef2f2)' : 'var(--color-bg)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <strong style={{ fontSize: '0.85rem' }}>{clinicianName}</strong>
                        {r.actionRequired && (
                          <span className="badge badge-danger">
                            <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                            Action required
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
                        {r.message}
                      </p>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <MessageSquare size={28} className="empty-state-icon" />
                <p>No clinician responses yet</p>
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
        </>
        )}

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

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <UserCircle size={18} style={{ color: 'var(--color-teal)' }} /> Clinical Profile
            </h3>
            <form onSubmit={handleSaveProfile} className="report-form">
              
              <div className="report-form-row">
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" value={profileForm.dateOfBirth} onChange={e => setProfileForm(f => ({ ...f, dateOfBirth: e.target.value }))} required />
                  {profileForm.dateOfBirth && (
                    <small style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>Age: {calculateAge(profileForm.dateOfBirth)} years</small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={profileForm.gender} onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))} required>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="report-form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" placeholder="e.g. +263-77-000-0000" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact</label>
                  <input type="text" className="form-input" value={profileForm.emergencyContact} onChange={e => setProfileForm(f => ({ ...f, emergencyContact: e.target.value }))} required />
                </div>
              </div>

              <div className="report-form-row">
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-input" value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Baseline Status</label>
                <select className="form-select" value={profileForm.baselineStatus} onChange={e => setProfileForm(f => ({ ...f, baselineStatus: e.target.value }))}>
                  <option value="stable">Stable</option>
                  <option value="fragile">Fragile</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chronic Conditions</label>
                <div className="symptom-grid">
                  {COMMON_CONDITIONS.map(c => (
                    <button
                      key={c} type="button"
                      className={`symptom-chip ${profileForm.chronicConditions.includes(c) ? 'symptom-chip--active' : ''}`}
                      onClick={() => handleConditionToggle(c)}
                    >
                      {formatSymptom(c)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Allergies (comma-separated)</label>
                <input type="text" className="form-input" placeholder="e.g. penicillin, peanuts" value={profileForm.allergies} onChange={e => setProfileForm(f => ({ ...f, allergies: e.target.value }))} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingProfile} style={{ width: '100%', marginTop: 8 }}>
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Note Modal */}
      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note" width={480}>
        <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Note</label>
            <textarea
              className="form-input"
              rows="6"
              placeholder="Add a note about your health, symptoms, or questions for your clinician..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingNote} style={{ width: '100%' }}>
            {savingNote ? 'Saving...' : <><MessageSquare size={16} /> Save Note</>}
          </button>
        </form>
      </Modal>

      {/* Escalation Modal */}
      <Modal isOpen={showEscalationModal} onClose={() => setShowEscalationModal(false)} title="Request Escalation" width={480}>
        <form onSubmit={handleEscalate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="alert alert-warning" style={{ marginBottom: 8 }}>
            <AlertTriangle size={16} />
            <span>This will notify your care team that you need urgent attention.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Escalation</label>
            <textarea
              className="form-input"
              rows="5"
              placeholder="Describe why you need urgent attention (e.g., worsening symptoms, severe pain, emergency situation)..."
              value={escalationReason}
              onChange={e => setEscalationReason(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-danger" disabled={savingEscalation} style={{ width: '100%' }}>
            {savingEscalation ? 'Submitting...' : <><AlertTriangle size={16} /> Submit Escalation</>}
          </button>
        </form>
      </Modal>
    </>
  );
}
