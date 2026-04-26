import { useState, useEffect } from 'react';
import Navigation from './Navigation.jsx';
import StatsCard from './StatsCard.jsx';
import PatientList from './PatientList.jsx';
import { fetchUserInfo, makeAuthenticatedRequest } from '../api/client.js';
import '../styles/ClinicianDashboard.css';

/**
 * ClinicianDashboard Component
 * 
 * Dashboard view specifically for CLINICIAN role users.
 * Shows:
 * - Assigned patients overview
 * - Pending reviews/alerts
 * - Appointment schedule
 * - Quick actions for patient management
 */
function ClinicianDashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [clinicianStats, setClinicianStats] = useState(null);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [pendingAlerts, setPendingAlerts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadClinicianData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch current user info
        const userData = await fetchUserInfo();
        setUserInfo(userData);

        // Fetch clinician-specific stats
        const statsPromise = makeAuthenticatedRequest(`/api/clinicians/${userData.id}/stats`);
        
        // Fetch assigned patients
        const patientsPromise = makeAuthenticatedRequest(`/api/clinicians/${userData.id}/patients`);
        
        // Fetch pending alerts
        const alertsPromise = makeAuthenticatedRequest(`/api/clinicians/${userData.id}/alerts?status=pending`);
        
        // Fetch today's appointments
        const appointmentsPromise = makeAuthenticatedRequest(`/api/clinicians/${userData.id}/appointments/today`);

        const [statsData, patientsData, alertsData, appointmentsData] = await Promise.all([
          statsPromise.catch(() => null),
          patientsPromise.catch(() => []),
          alertsPromise.catch(() => []),
          appointmentsPromise.catch(() => [])
        ]);

        setClinicianStats(statsData);
        setAssignedPatients(patientsData);
        setPendingAlerts(alertsData);
        setAppointments(appointmentsData);

      } catch (err) {
        console.error('Failed to load clinician data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadClinicianData();
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
          <h1 className="dashboard-title">Clinician Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, Dr. {userInfo?.fullName || 'Clinician'}
          </p>
        </header>

        {/* Clinician-specific statistics */}
        <section className="dashboard-stats">
          <StatsCard
            label="Assigned Patients"
            value={clinicianStats?.totalPatients || 0}
            icon="👥"
            color="#2563eb"
          />
          <StatsCard
            label="Pending Reviews"
            value={clinicianStats?.pendingReviews || 0}
            icon="📋"
            color="#f59e0b"
          />
          <StatsCard
            label="High Risk Alerts"
            value={clinicianStats?.highRiskAlerts || 0}
            icon="⚠️"
            color="#ef4444"
          />
          <StatsCard
            label="Today's Appointments"
            value={clinicianStats?.todayAppointments || 0}
            icon="📅"
            color="#10b981"
          />
        </section>

        {/* Main content area */}
        <section className="clinician-dashboard-content">
          {/* Assigned Patients List */}
          <div className="clinician-section">
            <h2 className="dashboard-section-title">My Patients</h2>
            <PatientList
              patients={assignedPatients}
              onPatientClick={(patient) => console.log('Selected patient:', patient)}
            />
          </div>

          {/* Right sidebar */}
          <div className="clinician-sidebar">
            {/* Pending Alerts */}
            <div className="clinician-section">
              <h2 className="dashboard-section-title">Pending Alerts</h2>
              <div className="alerts-list">
                {pendingAlerts && pendingAlerts.length > 0 ? (
                  pendingAlerts.map((alert) => (
                    <div key={alert.id} className="alert-card">
                      <div className="alert-card-header">
                        <span className="alert-patient-name">{alert.patientName}</span>
                        <span 
                          className="alert-priority-badge"
                          style={{
                            backgroundColor: alert.priority === 'HIGH' ? '#ef444415' : 
                                           alert.priority === 'MEDIUM' ? '#f59e0b15' : '#10b98115',
                            color: alert.priority === 'HIGH' ? '#ef4444' : 
                                   alert.priority === 'MEDIUM' ? '#f59e0b' : '#10b981'
                          }}
                        >
                          {alert.priority}
                        </span>
                      </div>
                      <div className="alert-card-message">{alert.message}</div>
                      <div className="alert-card-time">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No pending alerts</div>
                )}
              </div>
            </div>

            {/* Today's Appointments */}
            <div className="clinician-section">
              <h2 className="dashboard-section-title">Today's Schedule</h2>
              <div className="appointments-list">
                {appointments && appointments.length > 0 ? (
                  appointments.map((apt) => (
                    <div key={apt.id} className="appointment-card">
                      <div className="appointment-time">
                        {new Date(apt.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="appointment-patient">{apt.patientName}</div>
                      <div className="appointment-type">{apt.type || 'Follow-up'}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No appointments today</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ClinicianDashboard;
