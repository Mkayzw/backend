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
import PatientOnboarding, { isProfileIncomplete } from './PatientOnboarding';
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
  { key: 'followups', path: '/patient/followups' },
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reportFieldErrors, setReportFieldErrors] = useState({});
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [followupFilter, setFollowupFilter] = useState('all');
  const [updatingApptId, setUpdatingApptId] = useState(null);

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

      // Check if onboarding is needed (profile has placeholder data)
      if (myPatient && isProfileIncomplete(myPatient)) {
        setShowOnboarding(true);
      }

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

  // ── Appointment Actions (patient 2-way comms) ──
  const handleAppointmentAction = async (appointmentId, status) => {
    setUpdatingApptId(appointmentId);
    try {
      const updated = await followupAppointmentsAPI.update(appointmentId, { status });
      setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a));
      const labels = { CONFIRMED: 'confirmed', DECLINED: 'declined', RESCHEDULE_REQUESTED: 'reschedule requested' };
      success(`Appointment ${labels[status] || status.toLowerCase()}`);
    } catch (err) {
      toastError('Failed to update appointment: ' + (err.message || 'Unknown error'));
    } finally {
      setUpdatingApptId(null);
    }
  };

  const toggleSymptom = (s) => {
    setReportForm(f => ({
      ...f,
      symptoms: f.symptoms.includes(s)
        ? f.symptoms.filter(x => x !== s)
        : [...f.symptoms, s]
    }));
  };

  // ── Symptom Report Validation ──
  const validateReport = () => {
    const errors = {};
    if (reportForm.symptoms.length === 0) {
      errors.symptoms = 'Please select at least one symptom';
    }
    if (!reportForm.severity) {
      errors.severity = 'Severity is required';
    }
    if (!reportForm.durationDays || parseInt(reportForm.durationDays) < 1) {
      errors.durationDays = 'Duration must be at least 1 day';
    }
    if (parseInt(reportForm.durationDays) > 365) {
      errors.durationDays = 'Duration seems too long — please verify';
    }
    if (reportForm.temperature) {
      const temp = parseFloat(reportForm.temperature);
      if (isNaN(temp) || temp < 30 || temp > 45) {
        errors.temperature = 'Temperature must be between 30°C and 45°C';
      }
    }
    if (reportForm.heartRate) {
      const hr = parseInt(reportForm.heartRate);
      if (isNaN(hr) || hr < 20 || hr > 300) {
        errors.heartRate = 'Heart rate must be between 20 and 300 bpm';
      }
    }
    setReportFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!patient) return;
    if (!validateReport()) return;
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
    
    // Validate required fields with per-field errors
    const fieldErrs = {};
    if (!profileForm.dateOfBirth) {
      fieldErrs.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(profileForm.dateOfBirth);
      const now = new Date();
      if (dob > now) fieldErrs.dateOfBirth = 'Date of birth cannot be in the future';
      const ageYears = (now - dob) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears > 130) fieldErrs.dateOfBirth = 'Please enter a valid date of birth';
    }
    if (!profileForm.gender) fieldErrs.gender = 'Gender is required';
    if (!profileForm.emergencyContact.trim()) fieldErrs.emergencyContact = 'Emergency contact is required';
    if (!profileForm.address.trim()) fieldErrs.address = 'Address is required';
    if (!profileForm.allergies.trim()) fieldErrs.allergies = 'Allergies information is required (enter "None known" if applicable)';
    if (!profileForm.baselineStatus) fieldErrs.baselineStatus = 'Baseline status is required';
    if (profileForm.phone && !/^\+?[\d\s\-()]+$/.test(profileForm.phone)) {
      fieldErrs.phone = 'Please enter a valid phone number';
    }
    
    setProfileFieldErrors(fieldErrs);
    if (Object.keys(fieldErrs).length > 0) {
      toastError('Please fill in all required fields');
      return;
    }
    
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

  // ── Show onboarding if profile is incomplete ──
  if (showOnboarding && patient) {
    return (
      <PatientOnboarding
        patient={patient}
        onComplete={() => {
          setShowOnboarding(false);
          loadData();
        }}
      />
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
          <button className={`tab ${activeTab === 'followups' ? 'active' : ''}`} onClick={() => handleTabChange('followups')}>
            <CalendarPlus size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Follow-Ups
            {appointments.filter(a => a.status === 'SCHEDULED').length > 0 && (
              <span style={{
                background: 'var(--color-primary)', color: 'white', fontSize: '0.68rem',
                fontWeight: 700, borderRadius: 'var(--radius-full)', padding: '1px 7px',
                marginLeft: 6, lineHeight: 1.6
              }}>{appointments.filter(a => a.status === 'SCHEDULED').length}</span>
            )}
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
                      onClick={() => { toggleSymptom(s); if (reportFieldErrors.symptoms) setReportFieldErrors(fe => ({ ...fe, symptoms: '' })); }}
                    >
                      {formatSymptom(s)}
                    </button>
                  ))}
                </div>
                {(reportFieldErrors.symptoms || reportForm.symptoms.length === 0) && (
                  <span className="field-error">
                    <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {reportFieldErrors.symptoms || 'Select at least one symptom'}
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
                  <label className="form-label"><Thermometer size={13} /> Temperature (°C)</label>
                  <input type="number" step="0.1" className={`form-input ${reportFieldErrors.temperature ? 'input-error' : ''}`} placeholder="e.g. 37.5" value={reportForm.temperature} onChange={e => { setReportForm(f => ({ ...f, temperature: e.target.value })); if (reportFieldErrors.temperature) setReportFieldErrors(fe => ({ ...fe, temperature: '' })); }} />
                  {reportFieldErrors.temperature && <span className="field-error">{reportFieldErrors.temperature}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label"><HeartPulse size={13} /> Heart Rate (bpm)</label>
                  <input type="number" className={`form-input ${reportFieldErrors.heartRate ? 'input-error' : ''}`} placeholder="e.g. 80" value={reportForm.heartRate} onChange={e => { setReportForm(f => ({ ...f, heartRate: e.target.value })); if (reportFieldErrors.heartRate) setReportFieldErrors(fe => ({ ...fe, heartRate: '' })); }} />
                  {reportFieldErrors.heartRate && <span className="field-error">{reportFieldErrors.heartRate}</span>}
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

        {/* Follow-Ups Tab */}
        {activeTab === 'followups' && (
          <div className="followups-tab">
            {/* Appointments Section */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
                  <CalendarPlus size={18} style={{ color: 'var(--color-blue)' }} /> Scheduled Appointments
                </h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['all', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'DECLINED', 'RESCHEDULE_REQUESTED'].map(f => (
                    <button
                      key={f}
                      className={`btn btn-sm ${(followupFilter || 'all') === f ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFollowupFilter(f)}
                      style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                    >
                      {f === 'all' ? 'All' : f === 'RESCHEDULE_REQUESTED' ? 'Reschedule' : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const filtered = appointments.filter(a => {
                  if (!followupFilter || followupFilter === 'all') return true;
                  return a.status === followupFilter;
                }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

                if (filtered.length === 0) {
                  return (
                    <div className="empty-state">
                      <CalendarPlus size={36} className="empty-state-icon" />
                      <p>{followupFilter && followupFilter !== 'all'
                        ? `No ${followupFilter.toLowerCase()} appointments`
                        : 'No appointments scheduled yet'}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                        Your clinician will schedule follow-ups based on your health reports.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="followup-appointments-list">
                    {filtered.map((appt, idx) => {
                      const when = new Date(appt.scheduledAt);
                      const now = new Date();
                      const isPast = when < now;
                      const isUpcoming = appt.status === 'SCHEDULED' && !isPast;
                      const isToday = when.toDateString() === now.toDateString();
                      const clinicianName = appt.clinician?.fullName
                        || appt.clinician?.user?.fullName
                        || `Clinician #${appt.clinicianId}`;

                      const statusConfig = {
                        SCHEDULED: { badge: 'badge-info', label: 'Pending', icon: Calendar },
                        CONFIRMED: { badge: 'badge-success', label: 'Confirmed', icon: CheckCircle2 },
                        COMPLETED: { badge: 'badge-success', label: 'Completed', icon: CheckCircle2 },
                        CANCELLED: { badge: 'badge-neutral', label: 'Cancelled', icon: AlertCircle },
                        MISSED: { badge: 'badge-danger', label: 'Missed', icon: AlertTriangle },
                        DECLINED: { badge: 'badge-danger', label: 'Declined', icon: AlertCircle },
                        RESCHEDULE_REQUESTED: { badge: 'badge-warning', label: 'Reschedule Requested', icon: Calendar },
                      };
                      const sc = statusConfig[appt.status] || statusConfig.SCHEDULED;
                      const canAct = appt.status === 'SCHEDULED';
                      const isUpdating = updatingApptId === appt.id;
                      const StatusIcon = sc.icon;

                      return (
                        <div
                          key={appt.id}
                          className={`followup-appt-card animate-fade-in ${isToday ? 'followup-appt-card--today' : ''} ${isPast && appt.status === 'SCHEDULED' ? 'followup-appt-card--overdue' : ''}`}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          {/* Date sidebar */}
                          <div className={`followup-appt-date ${isUpcoming ? 'followup-appt-date--upcoming' : ''}`}>
                            <span className="followup-appt-month">
                              {when.toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                            <span className="followup-appt-day">{when.getDate()}</span>
                            <span className="followup-appt-year">{when.getFullYear()}</span>
                          </div>

                          {/* Content */}
                          <div className="followup-appt-body">
                            <div className="followup-appt-header">
                              <div>
                                <h4 className="followup-appt-reason">{appt.reason}</h4>
                                <div className="followup-appt-meta">
                                  <span>
                                    <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    {when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    {isToday && <span className="followup-today-tag">Today</span>}
                                  </span>
                                  <span>
                                    <Stethoscope size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    {clinicianName}
                                  </span>
                                </div>
                              </div>
                              <span className={`badge ${sc.badge}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <StatusIcon size={11} /> {sc.label}
                              </span>
                            </div>
                            {isPast && appt.status === 'SCHEDULED' && (
                              <div className="followup-overdue-notice">
                                <AlertTriangle size={13} />
                                <span>This appointment date has passed — contact your clinician to reschedule.</span>
                              </div>
                            )}
                            {canAct && (
                              <div className="followup-appt-actions">
                                <button
                                  className="btn btn-sm btn-success"
                                  disabled={isUpdating}
                                  onClick={() => handleAppointmentAction(appt.id, 'CONFIRMED')}
                                >
                                  <CheckCircle2 size={13} /> Accept
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  disabled={isUpdating}
                                  onClick={() => handleAppointmentAction(appt.id, 'RESCHEDULE_REQUESTED')}
                                >
                                  <Calendar size={13} /> Reschedule
                                </button>
                                <button
                                  className="btn btn-sm btn-danger-outline"
                                  disabled={isUpdating}
                                  onClick={() => handleAppointmentAction(appt.id, 'DECLINED')}
                                >
                                  <AlertCircle size={13} /> Decline
                                </button>
                              </div>
                            )}
                            {appt.status === 'CONFIRMED' && (
                              <div className="followup-confirmed-notice">
                                <CheckCircle2 size={13} />
                                <span>You have confirmed this appointment.</span>
                              </div>
                            )}
                            {appt.status === 'RESCHEDULE_REQUESTED' && (
                              <div className="followup-reschedule-notice">
                                <Calendar size={13} />
                                <span>You've requested a reschedule — your clinician will update the date.</span>
                              </div>
                            )}
                            {appt.status === 'DECLINED' && (
                              <div className="followup-declined-notice">
                                <AlertCircle size={13} />
                                <span>You declined this appointment. Your clinician will be notified.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Summary counters */}
              {appointments.length > 0 && (
                <div className="followup-summary">
                  <div className="followup-summary-item">
                    <span className="followup-summary-count" style={{ color: 'var(--color-info)' }}>
                      {appointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length}
                    </span>
                    <span className="followup-summary-label">Active</span>
                  </div>
                  <div className="followup-summary-item">
                    <span className="followup-summary-count" style={{ color: 'var(--color-success)' }}>
                      {appointments.filter(a => a.status === 'COMPLETED').length}
                    </span>
                    <span className="followup-summary-label">Completed</span>
                  </div>
                  <div className="followup-summary-item">
                    <span className="followup-summary-count" style={{ color: 'var(--color-warning)' }}>
                      {appointments.filter(a => a.status === 'CANCELLED').length}
                    </span>
                    <span className="followup-summary-label">Cancelled</span>
                  </div>
                  <div className="followup-summary-item">
                    <span className="followup-summary-count" style={{ color: 'var(--color-danger)' }}>
                      {appointments.filter(a => a.status === 'MISSED').length}
                    </span>
                    <span className="followup-summary-label">Missed</span>
                  </div>
                </div>
              )}
            </div>

            {/* Clinician Responses Section */}
            <div className="card" style={{ padding: 24 }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} style={{ color: 'var(--color-teal)' }} /> Clinician Responses
                {followUpResponses.filter(r => r.actionRequired).length > 0 && (
                  <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                    {followUpResponses.filter(r => r.actionRequired).length} action required
                  </span>
                )}
              </h3>

              {followUpResponses.length > 0 ? (
                <div className="followup-responses-list">
                  {followUpResponses.map((r, idx) => {
                    const clinicianName = r.clinician?.user?.fullName
                      || r.clinician?.fullName
                      || `Clinician #${r.clinicianId}`;
                    const when = new Date(r.createdAt);

                    return (
                      <div
                        key={r.id}
                        className={`followup-response-card animate-fade-in ${r.actionRequired ? 'followup-response-card--action' : ''}`}
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <div className="followup-response-header">
                          <div className="followup-response-clinician">
                            <div className="followup-response-avatar">
                              {clinicianName[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.88rem' }}>{clinicianName}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {r.clinician?.specialization?.replace(/_/g, ' ')}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {r.actionRequired && (
                              <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={11} /> Action Required
                              </span>
                            )}
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                              {when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{', '}
                              {when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="followup-response-message">
                          {r.message}
                        </div>
                        <div className="followup-response-footer">
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            <FileHeart size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Re: Symptom Report #{r.symptomReportId}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <MessageSquare size={36} className="empty-state-icon" />
                  <p>No clinician responses yet</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Responses from your clinicians will appear here after they review your symptom reports.
                  </p>
                </div>
              )}
            </div>
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
                  <label className="form-label">Date of Birth *</label>
                  <input type="date" className={`form-input ${profileFieldErrors.dateOfBirth ? 'input-error' : ''}`} value={profileForm.dateOfBirth} onChange={e => { setProfileForm(f => ({ ...f, dateOfBirth: e.target.value })); if (profileFieldErrors.dateOfBirth) setProfileFieldErrors(fe => ({ ...fe, dateOfBirth: '' })); }} required />
                  {profileFieldErrors.dateOfBirth && <span className="field-error">{profileFieldErrors.dateOfBirth}</span>}
                  {!profileFieldErrors.dateOfBirth && profileForm.dateOfBirth && (
                    <small style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>Age: {calculateAge(profileForm.dateOfBirth)} years</small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select className={`form-select ${profileFieldErrors.gender ? 'input-error' : ''}`} value={profileForm.gender} onChange={e => { setProfileForm(f => ({ ...f, gender: e.target.value })); if (profileFieldErrors.gender) setProfileFieldErrors(fe => ({ ...fe, gender: '' })); }} required>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {profileFieldErrors.gender && <span className="field-error">{profileFieldErrors.gender}</span>}
                </div>
              </div>

              <div className="report-form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className={`form-input ${profileFieldErrors.phone ? 'input-error' : ''}`} placeholder="e.g. +263-77-000-0000" value={profileForm.phone} onChange={e => { setProfileForm(f => ({ ...f, phone: e.target.value })); if (profileFieldErrors.phone) setProfileFieldErrors(fe => ({ ...fe, phone: '' })); }} />
                  {profileFieldErrors.phone && <span className="field-error">{profileFieldErrors.phone}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact *</label>
                  <input type="text" className={`form-input ${profileFieldErrors.emergencyContact ? 'input-error' : ''}`} value={profileForm.emergencyContact} onChange={e => { setProfileForm(f => ({ ...f, emergencyContact: e.target.value })); if (profileFieldErrors.emergencyContact) setProfileFieldErrors(fe => ({ ...fe, emergencyContact: '' })); }} required />
                  {profileFieldErrors.emergencyContact && <span className="field-error">{profileFieldErrors.emergencyContact}</span>}
                </div>
              </div>

              <div className="report-form-row">
                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input type="text" className={`form-input ${profileFieldErrors.address ? 'input-error' : ''}`} value={profileForm.address} onChange={e => { setProfileForm(f => ({ ...f, address: e.target.value })); if (profileFieldErrors.address) setProfileFieldErrors(fe => ({ ...fe, address: '' })); }} required />
                  {profileFieldErrors.address && <span className="field-error">{profileFieldErrors.address}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Baseline Status *</label>
                <select className={`form-select ${profileFieldErrors.baselineStatus ? 'input-error' : ''}`} value={profileForm.baselineStatus} onChange={e => { setProfileForm(f => ({ ...f, baselineStatus: e.target.value })); if (profileFieldErrors.baselineStatus) setProfileFieldErrors(fe => ({ ...fe, baselineStatus: '' })); }} required>
                  <option value="">Select...</option>
                  <option value="stable">Stable</option>
                  <option value="fragile">Fragile</option>
                  <option value="unknown">Unknown</option>
                </select>
                {profileFieldErrors.baselineStatus && <span className="field-error">{profileFieldErrors.baselineStatus}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Chronic Conditions (optional)</label>
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
                <label className="form-label">Allergies *</label>
                <input type="text" className={`form-input ${profileFieldErrors.allergies ? 'input-error' : ''}`} placeholder="e.g. penicillin, peanuts, or 'None known'" value={profileForm.allergies} onChange={e => { setProfileForm(f => ({ ...f, allergies: e.target.value })); if (profileFieldErrors.allergies) setProfileFieldErrors(fe => ({ ...fe, allergies: '' })); }} required />
                {profileFieldErrors.allergies && <span className="field-error">{profileFieldErrors.allergies}</span>}
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
