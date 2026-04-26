import { useState, useEffect } from 'react';
import Navigation from './Navigation.jsx';
import StatsCard from './StatsCard.jsx';
import { fetchUserInfo, fetchPatientTrend, makeAuthenticatedRequest } from '../api/client.js';
import '../styles/PatientDashboard.css';

/**
 * PatientDashboard Component
 * 
 * Dashboard view specifically for PATIENT role users.
 * Shows:
 * - Personal health statistics
 * - Recent symptom reports
 * - Risk trend chart for the logged-in patient
 * - Assigned clinician information
 */
function PatientDashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [patientStats, setPatientStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [clinicianInfo, setClinicianInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPatientData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch current user info
        const userData = await fetchUserInfo();
        setUserInfo(userData);

        // Fetch patient-specific stats
        const statsPromise = makeAuthenticatedRequest(`/api/patients/${userData.id}/stats`);
        
        // Fetch recent reports
        const reportsPromise = makeAuthenticatedRequest(`/api/patients/${userData.id}/reports?limit=5`);
        
        // Fetch assigned clinician info
        const clinicianPromise = makeAuthenticatedRequest(`/api/patients/${userData.id}/clinician`);

        const [statsData, reportsData, clinicianData] = await Promise.all([
          statsPromise.catch(() => null),
          reportsPromise.catch(() => []),
          clinicianPromise.catch(() => null)
        ]);

        setPatientStats(statsData);
        setRecentReports(reportsData);
        setClinicianInfo(clinicianData);

      } catch (err) {
        console.error('Failed to load patient data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>
        <div className="dashboard-loading-text">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="dashboard-error-icon">⚠️</div>
        <div className="dashboard-error-title">Failed to Load Dashboard</div>
        <div className="dashboard-error-message">{error}</div>
        <button className="dashboard-error-retry" onClick={handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Navigation userInfo={userInfo} />
      
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1 className="dashboard-title">My Health Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {userInfo?.fullName || 'Patient'}
          </p>
        </header>

        {/* Patient-specific statistics */}
        <section className="dashboard-stats">
          <StatsCard
            label="Current Risk Level"
            value={patientStats?.currentRiskLevel || 'N/A'}
            icon="📊"
            color="#2563eb"
          />
          <StatsCard
            label="Reports Submitted"
            value={patientStats?.totalReports || 0}
            icon="📝"
            color="#10b981"
          />
          <StatsCard
            label="Days Tracked"
            value={patientStats?.daysTracked || 0}
            icon="📅"
            color="#f59e0b"
          />
          <StatsCard
            label="Next Appointment"
            value={patientStats?.nextAppointment ? 'Scheduled' : 'None'}
            icon="👨‍⚕️"
            color="#8b5cf6"
          />
        </section>

        {/* Main content area */}
        <section className="patient-dashboard-content">
          {/* Recent Reports */}
          <div className="patient-section">
            <h2 className="dashboard-section-title">Recent Symptom Reports</h2>
            <div className="reports-list">
              {recentReports && recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <div key={report.id} className="report-card">
                    <div className="report-card-header">
                      <span className="report-date">
                        {new Date(report.submittedAt).toLocaleDateString()}
                      </span>
                      <span 
                        className="report-risk-badge"
                        style={{
                          backgroundColor: report.riskLevel === 'HIGH' ? '#ef444415' : 
                                         report.riskLevel === 'MEDIUM' ? '#f59e0b15' : '#10b98115',
                          color: report.riskLevel === 'HIGH' ? '#ef4444' : 
                                 report.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'
                        }}
                      >
                        {report.riskLevel} Risk
                      </span>
                    </div>
                    <div className="report-card-symptoms">
                      {report.symptoms && report.symptoms.join(', ')}
                    </div>
                    <div className="report-card-severity">
                      Severity: {report.severity}/10
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No reports yet. Start tracking your symptoms!</div>
              )}
            </div>
          </div>

          {/* Assigned Clinician */}
          {clinicianInfo && (
            <div className="patient-section">
              <h2 className="dashboard-section-title">My Clinician</h2>
              <div className="clinician-card">
                <div className="clinician-avatar">
                  {clinicianInfo.fullName?.charAt(0) || 'C'}
                </div>
                <div className="clinician-info">
                  <div className="clinician-name">{clinicianInfo.fullName}</div>
                  <div className="clinician-email">{clinicianInfo.email}</div>
                  <div className="clinician-specialty">{clinicianInfo.specialty || 'General Practice'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          <div className="patient-section">
            <h2 className="dashboard-section-title">My Risk Trend</h2>
            <div className="patient-trend-chart">
              {patientStats && (
                <img 
                  src={`/api/patients/${userInfo.id}/trend-chart`} 
                  alt="Risk Trend Chart"
                  className="trend-chart-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              )}
              <div className="chart-placeholder" style={{ display: 'none' }}>
                Chart visualization will appear here when connected to backend
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PatientDashboard;
