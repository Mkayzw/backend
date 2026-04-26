import { logout } from '../api/client.js';
import '../styles/Navigation.css';

/**
 * Navigation Component
 * 
 * Provides sidebar navigation with app branding, navigation links,
 * user information display, and logout functionality.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.userInfo - Current user information
 * @param {string} props.userInfo.fullName - User's full name
 * @param {string} props.userInfo.role - User's role (PATIENT, CLINICIAN, ADMIN)
 * @param {string} props.userInfo.email - User's email address
 */
function Navigation({ userInfo }) {
  /**
   * Handles logout button click
   * Calls logout function from API client which clears token and redirects
   */
  const handleLogout = () => {
    logout();
  };
  
  /**
   * Gets the display color for role badge based on role type
   */
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return '#ef4444'; // Red
      case 'CLINICIAN':
        return '#2563eb'; // Blue
      case 'PATIENT':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };
  
  return (
    <nav className="navigation">
      <div className="navigation-header">
        <div className="navigation-logo">
          ⚕️
        </div>
        <h1 className="navigation-title">Clinic Dashboard</h1>
      </div>
      
      <div className="navigation-links">
        <a href="#dashboard" className="navigation-link active">
          <span className="navigation-link-icon">📊</span>
          <span className="navigation-link-text">Dashboard</span>
        </a>
        
        <a href="#patients" className="navigation-link">
          <span className="navigation-link-icon">👥</span>
          <span className="navigation-link-text">Patients</span>
        </a>
        
        <a href="#appointments" className="navigation-link">
          <span className="navigation-link-icon">📅</span>
          <span className="navigation-link-text">Appointments</span>
        </a>
        
        <a href="#reports" className="navigation-link">
          <span className="navigation-link-icon">📋</span>
          <span className="navigation-link-text">Reports</span>
        </a>
      </div>
      
      <div className="navigation-footer">
        <div className="navigation-user">
          <div className="navigation-user-avatar">
            {userInfo?.fullName?.charAt(0) || '?'}
          </div>
          <div className="navigation-user-info">
            <div className="navigation-user-name">
              {userInfo?.fullName || 'Unknown User'}
            </div>
            <div 
              className="navigation-user-role"
              style={{ 
                backgroundColor: `${getRoleBadgeColor(userInfo?.role)}15`,
                color: getRoleBadgeColor(userInfo?.role)
              }}
            >
              {userInfo?.role || 'UNKNOWN'}
            </div>
          </div>
        </div>
        
        <button 
          className="navigation-logout"
          onClick={handleLogout}
          title="Sign out"
        >
          <span className="navigation-logout-icon">🚪</span>
          <span className="navigation-logout-text">Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default Navigation;
