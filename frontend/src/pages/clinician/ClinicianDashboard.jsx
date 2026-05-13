import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import { dashboardAPI } from '../../api/dashboard';
import { alertsAPI } from '../../api/alerts';
import { tasksAPI } from '../../api/tasks';
import { followupResponsesAPI } from '../../api/followupResponses';
import { followupAppointmentsAPI } from '../../api/followupAppointments';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import RiskBadge from '../../components/RiskBadge';
import TrendIndicator from '../../components/TrendIndicator';
import AlertCard from '../../components/AlertCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import PushAlertsButton from '../../components/PushAlertsButton';
import { startRealtimeStream } from '../../realtime/sse';
import {
  ShieldAlert, TrendingDown, Bell, FileHeart, Users, Activity,
  ChevronDown, ChevronUp, Clock, Info, ClipboardList, CheckCircle2, TimerReset,
  CalendarPlus, Send, RefreshCw
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import './ClinicianDashboard.css';

const CLINICIAN_TABS = [
  { key: 'patients', path: '/clinician' },
  { key: 'patients', path: '/clinician/patients' },
  { key: 'alerts', path: '/clinician/alerts' },
  { key: 'tasks', path: '/clinician/tasks' },
  { key: 'followups', path: '/clinician/followups' },
  { key: 'trends', path: '/clinician/trends' },
];
const CLINICIAN_PATH_TO_TAB = Object.fromEntries(CLINICIAN_TABS.map(t => [t.path, t.key]));

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

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ClinicianDashboard() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { setUnreadAlerts } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeTab = CLINICIAN_PATH_TO_TAB[location.pathname] || 'patients';
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  // Follow-up workflow state
  const [appointments, setAppointments] = useState([]);
  const [respondModal, setRespondModal] = useState({ open: false, alert: null });
  const [respondMessage, setRespondMessage] = useState('');
  const [respondActionRequired, setRespondActionRequired] = useState(false);
  const [respondSubmitting, setRespondSubmitting] = useState(false);
  const [scheduleModal, setScheduleModal] = useState({ open: false, alert: null });
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // Alert action modal (replaces window.prompt)
  const [alertActionModal, setAlertActionModal] = useState({ open: false, alert: null, action: '' });
  const [alertActionNote, setAlertActionNote] = useState('');
  const [alertActionHours, setAlertActionHours] = useState('4');
  const [alertActionSubmitting, setAlertActionSubmitting] = useState(false);

  // Create task modal (replaces window.prompt)
  const [createTaskModal, setCreateTaskModal] = useState({ open: false, alert: null });
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueHours, setTaskDueHours] = useState('24');
  const [createTaskSubmitting, setCreateTaskSubmitting] = useState(false);

  const handleTabChange = (tabKey) => {
    const tabPath = tabKey === 'patients' ? '/clinician' : `/clinician/${tabKey}`;
    navigate(tabPath, { replace: true });
  };

  const loadData = useCallback(async ({ showSpinner = true, silent = false } = {}) => {
    if (showSpinner) setLoading(true);
    try {
      const statsData = await dashboardAPI.getStats();
      setStats(statsData);
    } catch (err) { if (!silent) toastError('Failed to load stats: ' + (err.message || 'Unknown error')); }
    try {
      const patientsData = await dashboardAPI.getPrioritizedPatients();
      setPatients(patientsData);
    } catch (err) { if (!silent) toastError('Failed to load patients: ' + (err.message || 'Unknown error')); }
    try {
      const alertsData = await alertsAPI.getAll({ limit: 50 });
      setAlerts(alertsData);
      const unreadCount = (alertsData || []).filter(a => !a.isRead).length;
      setUnreadAlerts(unreadCount);
    } catch (err) { if (!silent) toastError('Failed to load alerts: ' + (err.message || 'Unknown error')); }
    try {
      const tasksData = await tasksAPI.getAll();
      setTasks(tasksData);
    } catch (err) { if (!silent) toastError('Failed to load tasks: ' + (err.message || 'Unknown error')); }
    try {
      const appts = await followupAppointmentsAPI.list();
      setAppointments(appts);
    } catch (err) { if (!silent) toastError('Failed to load follow-ups: ' + (err.message || 'Unknown error')); }
    if (showSpinner) setLoading(false);
  }, [setUnreadAlerts, toastError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    const refreshSilently = () => loadData({ showSpinner: false, silent: true });
    const intervalId = window.setInterval(refreshSilently, 15000);
    window.addEventListener('focus', refreshSilently);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshSilently);
    };
  }, [loadData]);

  useEffect(() => {
    const token = localStorage.getItem('rpm_token');
    if (!token) return;

    const stream = startRealtimeStream({
      token,
      onEvent: (evt) => {
        const incoming = evt?.data;
        if (!incoming?.id) return;

        setAlerts((prev) => {
          const updated = evt?.event === 'alert.updated'
            ? prev.map((item) => (item.id === incoming.id ? incoming : item))
            : prev.some((item) => item.id === incoming.id)
              ? prev
              : [incoming, ...prev].slice(0, 50);
          const unreadCount = updated.filter((item) => !item.isRead).length;
          setUnreadAlerts(unreadCount);
          setStats((current) => current ? ({ ...current, unreadAlerts: unreadCount }) : current);
          if (evt?.event === 'alert.created' && incoming.priority === 'HIGH') {
            success('New HIGH RISK alert received');
          }
          return updated;
        });
      },
      onError: (e) => {
        // Keep quiet unless debugging; realtime is best-effort.
        console.warn('Realtime stream error', e);
      }
    });

    return () => stream.stop();
  }, [setUnreadAlerts, success]);

  // ── Follow-up response (clinician replies to a symptom report) ──
  const openRespondModal = (alert) => {
    if (!alert?.symptomReportId) {
      toastError('This alert is not linked to a symptom report');
      return;
    }
    setRespondModal({ open: true, alert });
    setRespondMessage('');
    setRespondActionRequired(alert.priority === 'HIGH');
  };

  const submitFollowUpResponse = async (e) => {
    e.preventDefault();
    if (!respondModal.alert || !respondMessage.trim()) return;
    setRespondSubmitting(true);
    try {
      await followupResponsesAPI.create({
        symptomReportId: respondModal.alert.symptomReportId,
        message: respondMessage.trim(),
        actionRequired: respondActionRequired,
      });
      success('Response sent to patient');
      setRespondModal({ open: false, alert: null });
      setRespondMessage('');
      setRespondActionRequired(false);
    } catch (err) {
      toastError('Failed to send response: ' + (err.message || 'Unknown error'));
    } finally {
      setRespondSubmitting(false);
    }
  };

  // ── Schedule follow-up appointment ──
  const openScheduleModal = (alert) => {
    if (!alert?.patientId) {
      toastError('Missing patient on alert');
      return;
    }
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(0, 0, 0);
    setScheduleModal({ open: true, alert });
    setScheduleAt(tomorrow.toISOString().slice(0, 16));
    setScheduleReason(`Follow-up after ${alert.alertType?.replace(/_/g, ' ').toLowerCase() || 'alert'}`);
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleModal.alert || !scheduleAt || !scheduleReason.trim()) return;
    setScheduleSubmitting(true);
    try {
      const created = await followupAppointmentsAPI.create({
        patientId: scheduleModal.alert.patientId,
        scheduledAt: new Date(scheduleAt).toISOString(),
        reason: scheduleReason.trim(),
      });
      setAppointments(prev => [created, ...prev]);
      success('Follow-up scheduled');
      setScheduleModal({ open: false, alert: null });
      setScheduleAt('');
      setScheduleReason('');
    } catch (err) {
      toastError('Failed to schedule: ' + (err.message || 'Unknown error'));
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const updated = await followupAppointmentsAPI.update(appointmentId, { status });
      setAppointments(prev => prev.map(a => (a.id === appointmentId ? updated : a)));
      success(`Appointment ${status.toLowerCase()}`);
    } catch (err) {
      toastError('Failed to update appointment: ' + (err.message || 'Unknown error'));
    }
  };

  const loadTrend = async (patientId) => {
    if (expandedPatient === patientId) {
      setExpandedPatient(null);
      setTrendData(null);
      return;
    }
    setExpandedPatient(patientId);
    setTrendLoading(true);
    try {
      const data = await dashboardAPI.getPatientTrend(patientId);
      setTrendData(data);
    } catch (err) {
      toastError('Failed to load trend: ' + (err.message || 'Unknown error'));
    } finally {
      setTrendLoading(false);
    }
  };

  const replaceAlert = (updatedAlert) => {
    setAlerts((prev) => {
      const exists = prev.some((item) => item.id === updatedAlert.id);
      const next = exists
        ? prev.map((item) => (item.id === updatedAlert.id ? updatedAlert : item))
        : [updatedAlert, ...prev];
      const unreadCount = next.filter((item) => !item.isRead).length;
      setUnreadAlerts(unreadCount);
      setStats((current) => current ? ({ ...current, unreadAlerts: unreadCount }) : current);
      return next;
    });
  };

  const syncTaskStats = (nextTasks) => {
    const now = new Date();
    const openTasks = nextTasks.filter((task) => ['OPEN', 'IN_PROGRESS'].includes(task.status)).length;
    const overdueTasks = nextTasks.filter((task) => ['OPEN', 'IN_PROGRESS'].includes(task.status) && task.dueAt && new Date(task.dueAt) < now).length;
    setStats((current) => current ? ({ ...current, openTasks, overdueTasks }) : current);
  };

  const handleAlertAction = async (alert, action) => {
    // Actions requiring user input — open the modal
    if (action === 'ADD_NOTE' || action === 'RESOLVE' || action === 'ESCALATE' || action === 'SNOOZE') {
      setAlertActionModal({ open: true, alert, action });
      setAlertActionNote(alert.resolutionNote || '');
      setAlertActionHours('4');
      return;
    }

    // Direct actions (ACKNOWLEDGE, ASSIGN, etc.)
    try {
      const payload = { action };
      const updatedAlert = await alertsAPI.triage(alert.id, payload);
      replaceAlert(updatedAlert);
      success(`Alert ${action.toLowerCase().replace('_', ' ')} complete`);
    } catch (err) {
      toastError('Failed to update alert: ' + (err.message || 'Unknown error'));
    }
  };

  const submitAlertAction = async (e) => {
    e.preventDefault();
    if (!alertActionModal.alert) return;
    const { alert, action } = alertActionModal;
    setAlertActionSubmitting(true);
    try {
      const payload = { action };
      if (action === 'ADD_NOTE' || action === 'RESOLVE' || action === 'ESCALATE') {
        payload.resolutionNote = alertActionNote;
      }
      if (action === 'SNOOZE') {
        const hoursNumber = Number(alertActionHours);
        if (!Number.isFinite(hoursNumber) || hoursNumber <= 0) {
          toastError('Enter a valid number of hours');
          setAlertActionSubmitting(false);
          return;
        }
        payload.snoozedUntil = new Date(Date.now() + hoursNumber * 60 * 60 * 1000).toISOString();
      }
      const updatedAlert = await alertsAPI.triage(alert.id, payload);
      replaceAlert(updatedAlert);
      success(`Alert ${action.toLowerCase().replace('_', ' ')} complete`);
      setAlertActionModal({ open: false, alert: null, action: '' });
    } catch (err) {
      toastError('Failed to update alert: ' + (err.message || 'Unknown error'));
    } finally {
      setAlertActionSubmitting(false);
    }
  };

  const handleCreateTask = async (alert) => {
    setCreateTaskModal({ open: true, alert });
    setTaskTitle(`Follow up on ${alert.alertType?.replace(/_/g, ' ').toLowerCase()}`);
    setTaskDescription(alert.resolutionNote || '');
    setTaskDueHours('24');
  };

  const submitCreateTask = async (e) => {
    e.preventDefault();
    if (!createTaskModal.alert || !taskTitle.trim()) return;
    setCreateTaskSubmitting(true);
    try {
      const hoursNumber = Number(taskDueHours);
      const dueAt = Number.isFinite(hoursNumber) && hoursNumber > 0
        ? new Date(Date.now() + hoursNumber * 60 * 60 * 1000).toISOString()
        : null;
      const createdTask = await tasksAPI.create({
        createdFromAlertId: createTaskModal.alert.id,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        dueAt,
      });
      setTasks((prev) => {
        const nextTasks = [createdTask, ...prev];
        syncTaskStats(nextTasks);
        return nextTasks;
      });
      success('Follow-up task created');
      setCreateTaskModal({ open: false, alert: null });
    } catch (err) {
      toastError('Failed to create task: ' + (err.message || 'Unknown error'));
    } finally {
      setCreateTaskSubmitting(false);
    }
  };

  const handleTaskUpdate = async (taskId, status) => {
    try {
      const updatedTask = await tasksAPI.update(taskId, { status });
      setTasks((prev) => {
        const nextTasks = prev.map((task) => (task.id === taskId ? updatedTask : task));
        syncTaskStats(nextTasks);
        return nextTasks;
      });
      success('Task updated');
    } catch (err) {
      toastError('Failed to update task: ' + (err.message || 'Unknown error'));
    }
  };

  const formatSymptom = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const filteredAlerts = alerts.filter((alert) => {
    if (alertFilter === 'all') return true;
    if (alertFilter === 'new') return alert.status === 'NEW';
    if (alertFilter === 'mine') return alert.assignedToClinician?.userId === user?.id;
    if (alertFilter === 'escalated') return alert.status === 'ESCALATED';
    if (alertFilter === 'resolved') return alert.status === 'RESOLVED';
    return true;
  });

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'overdue') {
      return ['OPEN', 'IN_PROGRESS'].includes(task.status) && task.dueAt && new Date(task.dueAt) < new Date();
    }
    return task.status === taskFilter;
  });

  const trendChartData = trendData?.recentReports
    ? [...trendData.recentReports]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(r => ({
        date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        riskScore: r.riskScore,
        severity: r.severity === 'CRITICAL' ? 4 : r.severity === 'SEVERE' ? 3 : r.severity === 'MODERATE' ? 2 : 1,
      }))
    : [];

  if (loading) {
    return (
      <>
        <TopBar title="Clinical Dashboard" subtitle="Patient monitoring & prioritization" />
        <div className="page-content flex-center" style={{ height: '60vh' }}>
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Clinical Dashboard" subtitle={`Dr. ${user?.fullName || 'Clinician'} — Patient Monitoring`} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => loadData({ showSpinner: false })}>
            <RefreshCw size={14} /> Refresh
          </button>
          <PushAlertsButton />
        </div>
        {/* Stats */}
        <div className="stats-grid stagger-children">
          <StatCard icon={ShieldAlert} label="High Risk Patients" value={stats?.highRiskPatients || 0} color="red" delay={0} />
          <StatCard icon={TrendingDown} label="Worsening Trends" value={stats?.worseningPatients || 0} color="amber" delay={80} />
          <StatCard icon={Bell} label="Unread Alerts" value={stats?.unreadAlerts || 0} color="blue" delay={160} />
          <StatCard icon={FileHeart} label="Reports Today" value={stats?.reportsToday || 0} color="teal" delay={240} />
          <StatCard icon={ClipboardList} label="Open Tasks" value={stats?.openTasks || 0} color="blue" delay={320} />
          <StatCard icon={TimerReset} label="Overdue Tasks" value={stats?.overdueTasks || 0} color="amber" delay={400} />
        </div>

        {/* Tabs */}
        <div className="tabs mt-24">
          <button className={`tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => handleTabChange('patients')}>
            <Users size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Prioritized Patients
          </button>
          <button className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => handleTabChange('alerts')}>
            <Bell size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Alerts
            {alerts.filter(a => !a.isRead).length > 0 && (
              <span className="tab-badge">{alerts.filter(a => !a.isRead).length}</span>
            )}
          </button>
          <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => handleTabChange('tasks')}>
            <ClipboardList size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Tasks
            {tasks.filter((task) => ['OPEN', 'IN_PROGRESS'].includes(task.status)).length > 0 && (
              <span className="tab-badge">{tasks.filter((task) => ['OPEN', 'IN_PROGRESS'].includes(task.status)).length}</span>
            )}
          </button>
          <button className={`tab ${activeTab === 'followups' ? 'active' : ''}`} onClick={() => handleTabChange('followups')}>
            <CalendarPlus size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Follow-Ups
            {appointments.filter(a => a.status === 'SCHEDULED').length > 0 && (
              <span className="tab-badge">{appointments.filter(a => a.status === 'SCHEDULED').length}</span>
            )}
          </button>
          <button className={`tab ${activeTab === 'trends' ? 'active' : ''}`} onClick={() => handleTabChange('trends')}>
            <Activity size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Trend Analysis
          </button>
        </div>

        {/* Patients Tab */}
        {activeTab === 'patients' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="clinician-table-header">
              <div className="th-cell th-name">Patient</div>
              <div className="th-cell th-risk">Risk</div>
              <div className="th-cell th-trend">Trend</div>
              <div className="th-cell th-context">Care Context</div>
              <div className="th-cell th-last">Last Report</div>
              <div className="th-cell th-alerts">Alerts</div>
              <div className="th-cell th-action" />
            </div>

            <div className="clinician-table-body">
              {patients.length > 0 ? patients.map((p, idx) => {
                const latestReport = p.symptomReports?.[0];
                const assignment = p.assignments?.[0];
                const unreadAlerts = p.alerts?.filter(a => !a.isRead).length || 0;
                const symptoms = parseJsonArray(latestReport?.symptoms);
                const chronicConditions = parseJsonArray(p.chronicConditions);

                return (
                  <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className={`patient-row ${expandedPatient === p.id ? 'patient-row--expanded' : ''}`} onClick={() => loadTrend(p.id)}>
                      <div className="td-cell th-name">
                        <div className="patient-avatar" style={{
                          background: p.currentRiskLevel === 'HIGH'
                            ? 'linear-gradient(135deg, #EB5757, #D63031)'
                            : p.currentRiskLevel === 'MEDIUM'
                            ? 'linear-gradient(135deg, #F2994A, #E17055)'
                            : 'linear-gradient(135deg, var(--color-blue), var(--color-teal))'
                        }}>
                          {p.user?.fullName?.[0] || p.user?.email?.[0] || '?'}
                        </div>
                        <div>
                          <span className="patient-name">{p.user?.fullName || p.user?.email || `Patient #${p.id}`}</span>
                          {chronicConditions.length > 0 && (
                            <span className="patient-conditions">{chronicConditions.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="td-cell th-risk"><RiskBadge level={p.currentRiskLevel} /></div>
                      <div className="td-cell th-trend"><TrendIndicator status={p.currentTrendStatus} /></div>
                      <div className="td-cell th-context">
                        <span className="context-tag">{assignment?.careContext?.replace(/_/g, ' ') || 'N/A'}</span>
                      </div>
                      <div className="td-cell th-last">
                        {latestReport ? (
                          <span className="last-report-time">
                            <Clock size={13} />
                            {new Date(latestReport.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : <span className="text-muted">No reports</span>}
                      </div>
                      <div className="td-cell th-alerts">
                        {unreadAlerts > 0 && <span className="badge badge-danger">{unreadAlerts}</span>}
                      </div>
                      <div className="td-cell th-action">
                        {expandedPatient === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Expanded Trend Panel */}
                    {expandedPatient === p.id && (
                      <div className="patient-expanded animate-fade-in">
                      {trendLoading ? (
                        <div className="flex-center" style={{ padding: 40 }}><LoadingSpinner size={32} text="Loading trend data..." /></div>
                      ) : trendData ? (
                        <div className="trend-panel">
                          <div className="trend-info-grid">
                            <div className="trend-info-card">
                              <span className="trend-info-label">Risk Level</span>
                              <RiskBadge level={trendData.currentRiskLevel} />
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Trend Status</span>
                              <TrendIndicator status={trendData.currentTrendStatus} />
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Baseline</span>
                              <span className="trend-info-value">{trendData.baselineStatus || 'Unknown'}</span>
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Care Context</span>
                              <span className="trend-info-value">{trendData.careContext?.replace(/_/g, ' ') || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="trend-info-grid" style={{ marginTop: 12 }}>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Age / Gender</span>
                              <span className="trend-info-value">
                                {calculateAge(trendData.dateOfBirth) ? `${calculateAge(trendData.dateOfBirth)}y` : 'N/A'} · {trendData.gender || 'N/A'}
                              </span>
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Emergency Contact</span>
                              <span className="trend-info-value">{trendData.emergencyContact || 'N/A'}</span>
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Phone</span>
                              <span className="trend-info-value">{trendData.phone || 'N/A'}</span>
                            </div>
                            <div className="trend-info-card" style={{ gridColumn: 'span 2' }}>
                              <span className="trend-info-label">Address</span>
                              <span className="trend-info-value">{trendData.address || 'N/A'}</span>
                            </div>
                          </div>

                          {trendData.chronicConditions && trendData.chronicConditions !== '[]' && (
                            <div className="trend-conditions">
                              <Info size={14} />
                              <span>Chronic conditions: {JSON.parse(trendData.chronicConditions).join(', ')}</span>
                            </div>
                          )}
                          {trendData.allergies && trendData.allergies !== '[]' && (
                            <div className="trend-conditions" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                              <Info size={14} />
                              <span>Allergies: {JSON.parse(trendData.allergies).join(', ')}</span>
                            </div>
                          )}

                          {trendChartData.length > 1 && (
                            <div className="trend-chart-wrap">
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Activity size={15} /> Risk Score Over Time
                              </h4>
                              <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={trendChartData}>
                                  <defs>
                                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="var(--color-blue)" stopOpacity={0.25} />
                                      <stop offset="100%" stopColor="var(--color-blue)" stopOpacity={0.02} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                                  <XAxis dataKey="date" fontSize={11} stroke="var(--color-text-muted)" />
                                  <YAxis fontSize={11} stroke="var(--color-text-muted)" />
                                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: '0.8rem' }} />
                                  <Area type="monotone" dataKey="riskScore" stroke="var(--color-blue)" fill="url(#trendGrad)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-blue)' }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Latest Report */}
                          {latestReport && (
                            <div className="trend-latest">
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Latest Report</h4>
                              <div className="trend-report-details">
                                <div><strong>Symptoms:</strong> {symptoms.map(formatSymptom).join(', ')}</div>
                                <div><strong>Severity:</strong> {latestReport.severity} | <strong>Risk Score:</strong> {latestReport.riskScore?.toFixed(1)}</div>
                                {latestReport.riskExplanation && <div className="trend-explanation"><strong>Analysis:</strong> {latestReport.riskExplanation}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="empty-state" style={{ padding: 48 }}>
                  <Users size={36} className="empty-state-icon" />
                  <p>No patients assigned to you</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="clinician-table-header">
              <div className="th-cell th-name">Patient</div>
              <div className="th-cell th-risk">Risk</div>
              <div className="th-cell th-trend">Trend</div>
              <div className="th-cell th-action" />
            </div>

            {patients.length > 0 ? patients.map((p, idx) => {
              const isExpanded = expandedPatient === p.id;
              return (
                <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className={`patient-row ${isExpanded ? 'patient-row--expanded' : ''}`} onClick={() => loadTrend(p.id)}>
                    <div className="td-cell th-name">
                      <div className="patient-avatar" style={{
                        background: p.currentRiskLevel === 'HIGH'
                          ? 'linear-gradient(135deg, #EB5757, #D63031)'
                          : p.currentRiskLevel === 'MEDIUM'
                          ? 'linear-gradient(135deg, #F2994A, #E17055)'
                          : 'linear-gradient(135deg, var(--color-blue), var(--color-teal))'
                      }}>
                        {p.user?.fullName?.[0] || p.user?.email?.[0] || '?'}
                      </div>
                      <span className="patient-name">{p.user?.fullName || p.user?.email || `Patient #${p.id}`}</span>
                    </div>
                    <div className="td-cell th-risk"><RiskBadge level={p.currentRiskLevel} /></div>
                    <div className="td-cell th-trend"><TrendIndicator status={p.currentTrendStatus} /></div>
                    <div className="td-cell th-action">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="patient-expanded animate-fade-in">
                      {trendLoading ? (
                        <div className="flex-center" style={{ padding: 40 }}><LoadingSpinner size={32} text="Loading trend data..." /></div>
                      ) : trendData ? (
                        <div className="trend-panel">
                          <div className="trend-info-grid">
                            <div className="trend-info-card">
                              <span className="trend-info-label">Risk Level</span>
                              <RiskBadge level={trendData.currentRiskLevel} />
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Trend Status</span>
                              <TrendIndicator status={trendData.currentTrendStatus} />
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Baseline</span>
                              <span className="trend-info-value">{trendData.baselineStatus || 'Unknown'}</span>
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Care Context</span>
                              <span className="trend-info-value">{trendData.careContext?.replace(/_/g, ' ') || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="trend-info-grid" style={{ marginTop: 12 }}>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Age / Gender</span>
                              <span className="trend-info-value">
                                {calculateAge(trendData.dateOfBirth) ? `${calculateAge(trendData.dateOfBirth)}y` : 'N/A'} · {trendData.gender || 'N/A'}
                              </span>
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Emergency Contact</span>
                              <span className="trend-info-value">{trendData.emergencyContact || 'N/A'}</span>
                            </div>
                            <div className="trend-info-card">
                              <span className="trend-info-label">Phone</span>
                              <span className="trend-info-value">{trendData.phone || 'N/A'}</span>
                            </div>
                            <div className="trend-info-card" style={{ gridColumn: 'span 2' }}>
                              <span className="trend-info-label">Address</span>
                              <span className="trend-info-value">{trendData.address || 'N/A'}</span>
                            </div>
                          </div>

                          {trendData.chronicConditions && trendData.chronicConditions !== '[]' && (
                            <div className="trend-conditions">
                              <Info size={14} />
                              <span>Chronic conditions: {JSON.parse(trendData.chronicConditions).join(', ')}</span>
                            </div>
                          )}
                          {trendData.allergies && trendData.allergies !== '[]' && (
                            <div className="trend-conditions" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                              <Info size={14} />
                              <span>Allergies: {JSON.parse(trendData.allergies).join(', ')}</span>
                            </div>
                          )}

                          {trendChartData.length > 1 && (
                            <div className="trend-chart-wrap">
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Activity size={15} /> Risk Score Over Time
                              </h4>
                              <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={trendChartData}>
                                  <defs>
                                    <linearGradient id="trendGrad2" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="var(--color-blue)" stopOpacity={0.25} />
                                      <stop offset="100%" stopColor="var(--color-blue)" stopOpacity={0.02} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                                  <XAxis dataKey="date" fontSize={11} stroke="var(--color-text-muted)" />
                                  <YAxis fontSize={11} stroke="var(--color-text-muted)" />
                                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: '0.8rem' }} />
                                  <Area type="monotone" dataKey="riskScore" stroke="var(--color-blue)" fill="url(#trendGrad2)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-blue)' }} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="empty-state" style={{ padding: 48 }}>
                <Activity size={36} className="empty-state-icon" />
                <p>No patients to show trends for</p>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            <div className="alert-filters mb-16">
              {['all', 'new', 'mine', 'escalated', 'resolved'].map(f => (
                <button key={f} className={`btn btn-sm ${alertFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAlertFilter(f)}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="alerts-list">
              {filteredAlerts.length > 0 ? filteredAlerts.map(a => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onAction={handleAlertAction}
                  onCreateTask={handleCreateTask}
                  onRespond={openRespondModal}
                  onSchedule={openScheduleModal}
                />
              )) : (
                <div className="empty-state">
                  <Bell size={36} className="empty-state-icon" />
                  <p>No alerts matching filter</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            <div className="alert-filters mb-16">
              {['all', 'OPEN', 'IN_PROGRESS', 'DONE', 'overdue'].map((filter) => (
                <button
                  key={filter}
                  className={`btn btn-sm ${taskFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTaskFilter(filter)}
                >
                  {filter === 'all' ? 'All' : filter === 'overdue' ? 'Overdue' : filter.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <div className="task-list">
              {filteredTasks.length > 0 ? filteredTasks.map((task) => {
                const patientName = task.patient?.user?.fullname || task.patient?.user?.fullName || `Patient #${task.patientId}`;
                const isOverdue = ['OPEN', 'IN_PROGRESS'].includes(task.status) && task.dueAt && new Date(task.dueAt) < new Date();
                return (
                  <div key={task.id} className={`task-card ${isOverdue ? 'task-card--overdue' : ''}`}>
                    <div className="task-card__header">
                      <div>
                        <h4>{task.title}</h4>
                        <p>{patientName}</p>
                      </div>
                      <div className="task-card__badges">
                        <span className={`badge ${task.priority === 'HIGH' ? 'badge-danger' : task.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>
                          {task.priority}
                        </span>
                        <span className="badge badge-secondary">{task.status.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <div className="task-card__meta">
                      <span><Clock size={14} /> Due: {task.dueAt ? new Date(task.dueAt).toLocaleString() : 'No deadline'}</span>
                      {task.createdFromAlertId && <span><Bell size={14} /> From alert #{task.createdFromAlertId}</span>}
                    </div>
                    {task.description && <p className="task-card__description">{task.description}</p>}
                    <div className="task-card__actions">
                      {task.status === 'OPEN' && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleTaskUpdate(task.id, 'IN_PROGRESS')}>
                          <ClipboardList size={14} /> Start
                        </button>
                      )}
                      {task.status !== 'DONE' && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleTaskUpdate(task.id, 'DONE')}>
                          <CheckCircle2 size={14} /> Complete
                        </button>
                      )}
                      {task.status === 'DONE' && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleTaskUpdate(task.id, 'OPEN')}>
                          <TimerReset size={14} /> Reopen
                        </button>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-state">
                  <ClipboardList size={36} className="empty-state-icon" />
                  <p>No tasks matching filter</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Follow-Ups Tab */}
        {activeTab === 'followups' && (
          <div className="card" style={{ padding: 24 }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CalendarPlus size={18} style={{ color: 'var(--color-primary)' }} /> Scheduled Follow-Ups
            </h3>
            {appointments.length > 0 ? (
              <div className="task-list">
                {appointments.map(appt => {
                  const patientName = appt.patient?.user?.fullName || appt.patient?.user?.fullname || `Patient #${appt.patientId}`;
                  const when = new Date(appt.scheduledAt);
                  const isUpcoming = appt.status === 'SCHEDULED' && when > new Date();
                  const isPastDue = appt.status === 'SCHEDULED' && when <= new Date();
                  const statusBadgeCls = appt.status === 'COMPLETED' ? 'badge-success'
                    : appt.status === 'CANCELLED' ? 'badge-secondary'
                    : appt.status === 'MISSED' ? 'badge-danger'
                    : isPastDue ? 'badge-warning' : 'badge-info';
                  return (
                    <div key={appt.id} className={`task-card ${isPastDue ? 'task-card--overdue' : ''}`}>
                      <div className="task-card__header">
                        <div>
                          <h4>{appt.reason}</h4>
                          <p>{patientName}</p>
                        </div>
                        <div className="task-card__badges">
                          <span className={`badge ${statusBadgeCls}`}>{appt.status}</span>
                        </div>
                      </div>
                      <div className="task-card__meta">
                        <span><Clock size={14} /> {when.toLocaleString()}</span>
                        {isUpcoming && <span style={{ color: 'var(--color-primary)' }}>Upcoming</span>}
                        {isPastDue && <span style={{ color: 'var(--color-warning, #d97706)' }}>Past due</span>}
                      </div>
                      {appt.status === 'SCHEDULED' && (
                        <div className="task-card__actions">
                          <button className="btn btn-sm btn-primary" onClick={() => updateAppointmentStatus(appt.id, 'COMPLETED')}>
                            <CheckCircle2 size={14} /> Mark Completed
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => updateAppointmentStatus(appt.id, 'MISSED')}>
                            Missed
                          </button>
                          <button className="btn btn-sm btn-secondary" onClick={() => updateAppointmentStatus(appt.id, 'CANCELLED')}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <CalendarPlus size={36} className="empty-state-icon" />
                <p>No follow-ups scheduled yet</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Use the Schedule Follow-Up button on any alert to create one.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Respond to Symptom Report Modal */}
      <Modal
        isOpen={respondModal.open}
        onClose={() => setRespondModal({ open: false, alert: null })}
        title="Respond to symptom report"
        width={520}
      >
        <form onSubmit={submitFollowUpResponse} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {respondModal.alert && (
            <div style={{
              fontSize: '0.78rem', color: 'var(--color-text-secondary)',
              padding: 10, background: 'var(--color-bg)', borderRadius: 8
            }}>
              Patient: <strong>{respondModal.alert.patient?.user?.fullName || `#${respondModal.alert.patientId}`}</strong>
              {' · '}Alert: {respondModal.alert.alertType?.replace(/_/g, ' ')}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Response message</label>
            <textarea
              className="form-input"
              rows="5"
              autoFocus
              placeholder='e.g. "Continue medication and monitor for 24 hours. Visit clinic if breathing worsens."'
              value={respondMessage}
              onChange={e => setRespondMessage(e.target.value)}
              required
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={respondActionRequired}
              onChange={e => setRespondActionRequired(e.target.checked)}
            />
            Action required by patient
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setRespondModal({ open: false, alert: null })}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={respondSubmitting || !respondMessage.trim()}>
              {respondSubmitting ? 'Sending...' : <><Send size={14} /> Send Response</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Follow-Up Modal */}
      <Modal
        isOpen={scheduleModal.open}
        onClose={() => setScheduleModal({ open: false, alert: null })}
        title="Schedule follow-up"
        width={520}
      >
        <form onSubmit={submitSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {scheduleModal.alert && (
            <div style={{
              fontSize: '0.78rem', color: 'var(--color-text-secondary)',
              padding: 10, background: 'var(--color-bg)', borderRadius: 8
            }}>
              Patient: <strong>{scheduleModal.alert.patient?.user?.fullName || `#${scheduleModal.alert.patientId}`}</strong>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Date & time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={scheduleAt}
              onChange={e => setScheduleAt(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Review of asthma symptoms"
              value={scheduleReason}
              onChange={e => setScheduleReason(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setScheduleModal({ open: false, alert: null })}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={scheduleSubmitting || !scheduleAt || !scheduleReason.trim()}>
              {scheduleSubmitting ? 'Scheduling...' : <><CalendarPlus size={14} /> Schedule</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Alert Action Modal (replaces window.prompt) */}
      <Modal
        isOpen={alertActionModal.open}
        onClose={() => setAlertActionModal({ open: false, alert: null, action: '' })}
        title={
          alertActionModal.action === 'RESOLVE' ? 'Resolve Alert' :
          alertActionModal.action === 'ESCALATE' ? 'Escalate Alert' :
          alertActionModal.action === 'SNOOZE' ? 'Snooze Alert' :
          'Add Clinician Note'
        }
        width={500}
      >
        <form onSubmit={submitAlertAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alertActionModal.alert && (
            <div style={{
              fontSize: '0.78rem', color: 'var(--color-text-secondary)',
              padding: 10, background: 'var(--color-bg)', borderRadius: 8
            }}>
              Patient: <strong>{alertActionModal.alert.patient?.user?.fullName || `#${alertActionModal.alert.patientId}`}</strong>
              {' · '}Alert: {alertActionModal.alert.alertType?.replace(/_/g, ' ')}
            </div>
          )}
          {alertActionModal.action === 'SNOOZE' ? (
            <div className="form-group">
              <label className="form-label">Snooze for how many hours?</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="168"
                value={alertActionHours}
                onChange={e => setAlertActionHours(e.target.value)}
                autoFocus
                required
              />
              <small style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
                Alert will reappear after {alertActionHours || '0'} hours
              </small>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                {alertActionModal.action === 'RESOLVE' ? 'Resolution note' : 'Clinician note'}
              </label>
              <textarea
                className="form-input"
                rows="4"
                autoFocus
                placeholder={
                  alertActionModal.action === 'RESOLVE'
                    ? 'Describe how this alert was resolved...'
                    : alertActionModal.action === 'ESCALATE'
                    ? 'Reason for escalation...'
                    : 'Add your clinical note...'
                }
                value={alertActionNote}
                onChange={e => setAlertActionNote(e.target.value)}
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setAlertActionModal({ open: false, alert: null, action: '' })}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={alertActionSubmitting}>
              {alertActionSubmitting ? 'Processing...' : (
                alertActionModal.action === 'RESOLVE' ? 'Resolve' :
                alertActionModal.action === 'ESCALATE' ? 'Escalate' :
                alertActionModal.action === 'SNOOZE' ? 'Snooze' :
                'Save Note'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Task Modal (replaces window.prompt) */}
      <Modal
        isOpen={createTaskModal.open}
        onClose={() => setCreateTaskModal({ open: false, alert: null })}
        title="Create Follow-Up Task"
        width={540}
      >
        <form onSubmit={submitCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {createTaskModal.alert && (
            <div style={{
              fontSize: '0.78rem', color: 'var(--color-text-secondary)',
              padding: 10, background: 'var(--color-bg)', borderRadius: 8
            }}>
              From alert: <strong>{createTaskModal.alert.alertType?.replace(/_/g, ' ')}</strong>
              {' · '}Patient: {createTaskModal.alert.patient?.user?.fullName || `#${createTaskModal.alert.patientId}`}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Task title *</label>
            <input
              type="text"
              className="form-input"
              autoFocus
              placeholder="e.g. Follow up on breathing issues"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input"
              rows="3"
              placeholder="Additional details or context..."
              value={taskDescription}
              onChange={e => setTaskDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Due in how many hours?</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="720"
              value={taskDueHours}
              onChange={e => setTaskDueHours(e.target.value)}
            />
            <small style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
              Leave empty or 0 for no deadline
            </small>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateTaskModal({ open: false, alert: null })}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createTaskSubmitting || !taskTitle.trim()}>
              {createTaskSubmitting ? 'Creating...' : <><ClipboardList size={14} /> Create Task</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
