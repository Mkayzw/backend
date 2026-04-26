import { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import PatientDashboard from './components/PatientDashboard.jsx';
import ClinicianDashboard from './components/ClinicianDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { getAuthToken, getUserInfo } from './api/client.js';
import './App.css';

/**
 * App Component
 * 
 * Root component that handles authentication-based routing.
 * Shows Login page if user is not authenticated, otherwise shows role-specific Dashboard.
 * 
 * Authentication is determined by checking for JWT token in localStorage.
 * User role determines which dashboard view is displayed:
 * - PATIENT: PatientDashboard
 * - CLINICIAN: ClinicianDashboard
 * - ADMIN: AdminDashboard
 */
function App() {
  // State for authentication status and user info
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userRole, setUserRole] = useState(null);
  
  /**
   * Check authentication status on component mount
   * Verifies if JWT token exists in localStorage and gets user role
   */
  useEffect(() => {
    // Check for token in localStorage
    const token = getAuthToken();
    
    if (token) {
      // Get user info to determine role
      const userInfo = getUserInfo();
      setUserRole(userInfo?.role || null);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    
    // Mark auth check as complete
    setIsCheckingAuth(false);
  }, []);
  
  /**
   * Show loading state while checking authentication
   * Prevents flash of login page for authenticated users
   */
  if (isCheckingAuth) {
    return (
      <div className="app-loading">
        <div className="app-spinner"></div>
      </div>
    );
  }
  
  /**
   * Render based on authentication status and user role
   * - Not authenticated: Show Login page
   * - Authenticated PATIENT: Show PatientDashboard
   * - Authenticated CLINICIAN: Show ClinicianDashboard
   * - Authenticated ADMIN: Show AdminDashboard
   * - Authenticated (other/unknown): Show default Dashboard
   */
  const renderDashboard = () => {
    switch (userRole) {
      case 'PATIENT':
        return <PatientDashboard />;
      case 'CLINICIAN':
        return <ClinicianDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      default:
        return <Dashboard />;
    }
  };
  
  return (
    <div className="app">
      {isAuthenticated ? renderDashboard() : <Login />}
    </div>
  );
}

export default App;
