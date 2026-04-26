import { useState, useEffect } from 'react';
import Navigation from './Navigation.jsx';
import StatsCard from './StatsCard.jsx';
import PatientList from './PatientList.jsx';
import TrendChart from './TrendChart.jsx';
import { fetchDashboardStats, fetchPrioritizedPatients, fetchUserInfo } from '../api/client.js';
import '../styles/Dashboard.css';

/**
 * Dashboard Component
 * 
 * Main application view displaying patient monitoring data including:
 * - Navigation with user info
 * - Statistics cards (total patients, appointments, alerts)
 * - Prioritized patient list with risk levels
 * - Trend chart for selected patient
 * 
 * Fetches all data from backend API on mount and manages loading/error states.
 */
function Dashboard() {
  // State for dashboard data
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // State for UI feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  /**
   * Fetches all dashboard data on component mount
   * Loads: user info, dashboard stats, and prioritized patients
   */
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all data in parallel for better performance
        const [userInfoData, statsData, patientsData] = await Promise.all([
          fetchUserInfo(),
          fetchDashboardStats(),
          fetchPrioritizedPatients()
        ]);
        
        // Update state with fetched data
        setUserInfo(userInfoData);
        setStats(statsData);
        setPatients(patientsData);
        
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);
  
  /**
   * Handles patient selection from the patient list
   * Updates selectedPatient state to trigger TrendChart display
   */
  const handlePatientClick = (patient) => {
    setSelectedPatient(patient);
  };
  
  /**
   * Handles retry button click after error
   * Reloads all dashboard data
   */
  const handleRetry = () => {
    window.location.reload();
  };
  
  // Loading state - show spinner
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>
        <div className="dashboard-loading-text">Loading dashboard...</div>
      </div>
    );
  }
  
  // Error state - show error message with retry button
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
      {/* Navigation sidebar with user info */}
      <Navigation userInfo={userInfo} />
      
      {/* Main content area */}
      <main className="dashboard-main">
        {/* Dashboard header */}
        <header className="dashboard-header">
          <h1 className="dashboard-title">Dashboard Overview</h1>
          <p className="dashboard-subtitle">
            Welcome back, {userInfo?.fullName || 'User'}
          </p>
        </header>
        
        {/* Statistics cards section */}
        <section className="dashboard-stats">
          <StatsCard
            label="Total Patients"
            value={stats?.totalPatients || 0}
            icon="👥"
            color="#2563eb"
          />
          <StatsCard
            label="Appointments Today"
            value={stats?.appointmentsToday || 0}
            icon="📅"
            color="#10b981"
          />
          <StatsCard
            label="High Risk Alerts"
            value={stats?.highRiskAlerts || 0}
            icon="⚠️"
            color="#ef4444"
          />
          <StatsCard
            label="Active Assignments"
            value={stats?.activeAssignments || 0}
            icon="📋"
            color="#f59e0b"
          />
          <StatsCard
            label="Recent Reports"
            value={stats?.recentReports || 0}
            icon="📊"
            color="#8b5cf6"
          />
        </section>
        
        {/* Patient list and trend chart section */}
        <section className="dashboard-content">
          {/* Patient list */}
          <div className="dashboard-patients">
            <h2 className="dashboard-section-title">Prioritized Patients</h2>
            <PatientList
              patients={patients}
              onPatientClick={handlePatientClick}
            />
          </div>
          
          {/* Trend chart - only shown when patient is selected */}
          {selectedPatient && (
            <div className="dashboard-chart">
              <TrendChart
                patientId={selectedPatient.id}
                patientName={selectedPatient.fullName}
              />
            </div>
          )}
          
          {/* Placeholder when no patient is selected */}
          {!selectedPatient && (
            <div className="dashboard-chart-placeholder">
              <div className="dashboard-chart-placeholder-icon">📊</div>
              <div className="dashboard-chart-placeholder-text">
                Select a patient to view their risk trend
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
