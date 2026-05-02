import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import { dashboardAPI } from '../../api/dashboard';
import { alertsAPI } from '../../api/alerts';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import RiskBadge from '../../components/RiskBadge';
import TrendIndicator from '../../components/TrendIndicator';
import AlertCard from '../../components/AlertCard';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  ShieldAlert, TrendingDown, Bell, FileHeart, Users, Activity,
  ChevronDown, ChevronUp, Calendar, Stethoscope, Clock, Info
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import './ClinicianDashboard.css';

const CLINICIAN_TABS = [
  { key: 'patients', path: '/clinician' },
  { key: 'patients', path: '/clinician/patients' },
  { key: 'alerts', path: '/clinician/alerts' },
  { key: 'trends', path: '/clinician/trends' },
];
const CLINICIAN_PATH_TO_TAB = Object.fromEntries(CLINICIAN_TABS.map(t => [t.path, t.key]));

export default function ClinicianDashboard() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { setUnreadAlerts } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => CLINICIAN_PATH_TO_TAB[location.pathname] || 'patients');
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');

  // Sync tab with URL changes (e.g. sidebar navigation)
  useEffect(() => {
    const urlTab = CLINICIAN_PATH_TO_TAB[location.pathname];
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [location.pathname]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const tabPath = tabKey === 'patients' ? '/clinician' : `/clinician/${tabKey}`;
    navigate(tabPath, { replace: true });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsData = await dashboardAPI.getStats();
      setStats(statsData);
    } catch (err) { toastError('Failed to load stats: ' + (err.message || 'Unknown error')); }
    try {
      const patientsData = await dashboardAPI.getPrioritizedPatients();
      setPatients(patientsData);
    } catch (err) { toastError('Failed to load patients: ' + (err.message || 'Unknown error')); }
    try {
      const alertsData = await alertsAPI.getAll({ limit: 50 });
      setAlerts(alertsData);
      const unreadCount = (alertsData || []).filter(a => !a.isRead).length;
      setUnreadAlerts(unreadCount);
    } catch (err) { toastError('Failed to load alerts: ' + (err.message || 'Unknown error')); }
    setLoading(false);
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

  const handleMarkRead = async (alertId) => {
    try {
      await alertsAPI.markRead(alertId);
      setAlerts(prev => {
        const updated = prev.map(a => a.id === alertId ? { ...a, isRead: true } : a);
        setUnreadAlerts(updated.filter(a => !a.isRead).length);
        return updated;
      });
      success('Alert marked as read');
    } catch (err) {
      toastError('Failed to mark alert read: ' + (err.message || 'Unknown error'));
    }
  };

  const formatSymptom = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const filteredAlerts = alertFilter === 'all' ? alerts
    : alertFilter === 'unread' ? alerts.filter(a => !a.isRead)
    : alerts.filter(a => a.priority === alertFilter);

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
        {/* Stats */}
        <div className="stats-grid stagger-children">
          <StatCard icon={ShieldAlert} label="High Risk Patients" value={stats?.highRiskPatients || 0} color="red" delay={0} />
          <StatCard icon={TrendingDown} label="Worsening Trends" value={stats?.worseningPatients || 0} color="amber" delay={80} />
          <StatCard icon={Bell} label="Unread Alerts" value={stats?.unreadAlerts || 0} color="blue" delay={160} />
          <StatCard icon={FileHeart} label="Reports Today" value={stats?.reportsToday || 0} color="teal" delay={240} />
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

            {patients.length > 0 ? patients.map((p, idx) => {
              const latestReport = p.symptomReports?.[0];
              const assignment = p.assignments?.[0];
              const unreadAlerts = p.alerts?.filter(a => !a.isRead).length || 0;
              let symptoms = [];
              try { symptoms = JSON.parse(latestReport?.symptoms || '[]'); } catch {}

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
                        {p.chronicConditions && p.chronicConditions !== '[]' && (
                          <span className="patient-conditions">{JSON.parse(p.chronicConditions).join(', ')}</span>
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
                              <span className="trend-info-label">DOB / Gender</span>
                              <span className="trend-info-value">
                                {trendData.dateOfBirth ? new Date(trendData.dateOfBirth).toLocaleDateString() : 'N/A'} · {trendData.gender || 'N/A'}
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
                              <span className="trend-info-label">DOB / Gender</span>
                              <span className="trend-info-value">
                                {trendData.dateOfBirth ? new Date(trendData.dateOfBirth).toLocaleDateString() : 'N/A'} · {trendData.gender || 'N/A'}
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
              {['all', 'unread', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                <button key={f} className={`btn btn-sm ${alertFilter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAlertFilter(f)}>
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : f}
                </button>
              ))}
            </div>
            <div className="alerts-list">
              {filteredAlerts.length > 0 ? filteredAlerts.map(a => (
                <AlertCard key={a.id} alert={a} onMarkRead={handleMarkRead} />
              )) : (
                <div className="empty-state">
                  <Bell size={36} className="empty-state-icon" />
                  <p>No alerts matching filter</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
