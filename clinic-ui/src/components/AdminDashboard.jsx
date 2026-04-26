import { useState, useEffect } from 'react';
import Navigation from './Navigation.jsx';
import StatsCard from './StatsCard.jsx';
import { fetchUserInfo, makeAuthenticatedRequest } from '../api/client.js';
import '../styles/AdminDashboard.css';

/**
 * AdminDashboard Component
 * 
 * Dashboard view specifically for ADMIN role users.
 * Shows:
 * - System-wide statistics
 * - User management overview
 * - Recent activity logs
 * - System health metrics
 */
function AdminDashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAdminData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch current user info
        const userData = await fetchUserInfo();
        setUserInfo(userData);

        // Fetch system-wide stats
        const statsPromise = makeAuthenticatedRequest('/api/admin/stats');
        
        // Fetch recent users
        const usersPromise = makeAuthenticatedRequest('/api/admin/users?limit=10&sort=createdAt&order=desc');
        
        // Fetch activity logs
        const logsPromise = makeAuthenticatedRequest('/api/admin/activity-logs?limit=15');
        
        // Fetch system health
        const healthPromise = makeAuthenticatedRequest('/api/admin/system-health');

        const [statsData, usersData, logsData, healthData] = await Promise.all([
          statsPromise.catch(() => null),
          usersPromise.catch(() => []),
          logsPromise.catch(() => []),
          healthPromise.catch(() => null)
        ]);

        setSystemStats(statsData);
        setRecentUsers(usersData);
        setActivityLogs(logsData);
        setSystemHealth(healthData);

      } catch (err) {
        console.error('Failed to load admin data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>
        <div className="dashboard-loading-text">Loading admin dashboard...</div>
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
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {userInfo?.fullName || 'Administrator'}
          </p>
        </header>

        {/* Admin system statistics */}
        <section className="dashboard-stats">
          <StatsCard
            label="Total Users"
            value={systemStats?.totalUsers || 0}
            icon="👥"
            color="#2563eb"
          />
          <StatsCard
            label="Active Patients"
            value={systemStats?.activePatients || 0}
            icon="🏥"
            color="#10b981"
          />
          <StatsCard
            label="Clinicians"
            value={systemStats?.totalClinicians || 0}
            icon="👨‍⚕️"
            color="#f59e0b"
          />
          <StatsCard
            label="Reports Today"
            value={systemStats?.reportsToday || 0}
            icon="📊"
            color="#8b5cf6"
          />
          <StatsCard
            label="System Alerts"
            value={systemStats?.activeAlerts || 0}
            icon="🔔"
            color="#ef4444"
          />
        </section>

        {/* Main content area */}
        <section className="admin-dashboard-content">
          {/* Left column */}
          <div className="admin-main-column">
            {/* Recent Users */}
            <div className="admin-section">
              <h2 className="dashboard-section-title">Recent Users</h2>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers && recentUsers.length > 0 ? (
                      recentUsers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.fullName}</td>
                          <td>{user.email}</td>
                          <td>
                            <span 
                              className="role-badge"
                              style={{
                                backgroundColor: user.role === 'ADMIN' ? '#ef444415' : 
                                               user.role === 'CLINICIAN' ? '#2563eb15' : '#10b98115',
                                color: user.role === 'ADMIN' ? '#ef4444' : 
                                       user.role === 'CLINICIAN' ? '#2563eb' : '#10b981'
                              }}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-state">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Logs */}
            <div className="admin-section">
              <h2 className="dashboard-section-title">Recent Activity</h2>
              <div className="activity-logs-list">
                {activityLogs && activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <div key={log.id} className="activity-log-item">
                      <div className="log-item-icon">
                        {log.actionType === 'LOGIN' ? '🔐' : 
                         log.actionType === 'REPORT_SUBMIT' ? '📝' :
                         log.actionType === 'ALERT' ? '⚠️' : '📋'}
                      </div>
                      <div className="log-item-content">
                        <div className="log-item-message">{log.description}</div>
                        <div className="log-item-meta">
                          <span className="log-item-user">{log.userName || 'System'}</span>
                          <span className="log-item-time">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">No recent activity</div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="admin-sidebar">
            {/* System Health */}
            {systemHealth && (
              <div className="admin-section">
                <h2 className="dashboard-section-title">System Health</h2>
                <div className="system-health-cards">
                  <div className="health-card">
                    <div className="health-card-label">API Status</div>
                    <div className={`health-card-value ${systemHealth.apiHealthy ? 'health-good' : 'health-bad'}`}>
                      {systemHealth.apiHealthy ? '✓ Operational' : '✗ Issues'}
                    </div>
                  </div>
                  <div className="health-card">
                    <div className="health-card-label">Database</div>
                    <div className={`health-card-value ${systemHealth.dbHealthy ? 'health-good' : 'health-bad'}`}>
                      {systemHealth.dbHealthy ? '✓ Connected' : '✗ Disconnected'}
                    </div>
                  </div>
                  <div className="health-card">
                    <div className="health-card-label">Uptime</div>
                    <div className="health-card-value">{systemHealth.uptime || 'N/A'}</div>
                  </div>
                  <div className="health-card">
                    <div className="health-card-label">Last Backup</div>
                    <div className="health-card-value">
                      {systemHealth.lastBackup ? new Date(systemHealth.lastBackup).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="admin-section">
              <h2 className="dashboard-section-title">Quick Actions</h2>
              <div className="quick-actions-grid">
                <button className="quick-action-btn">
                  <span className="quick-action-icon">👤</span>
                  Manage Users
                </button>
                <button className="quick-action-btn">
                  <span className="quick-action-icon">📊</span>
                  View Reports
                </button>
                <button className="quick-action-btn">
                  <span className="quick-action-icon">⚙️</span>
                  System Settings
                </button>
                <button className="quick-action-btn">
                  <span className="quick-action-icon">📋</span>
                  Audit Logs
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
