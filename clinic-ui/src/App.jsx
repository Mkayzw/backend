import { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import { getAuthToken } from './api/client.js';
import './App.css';

/**
 * App Component
 * 
 * Root component that handles authentication-based routing.
 * Shows Login page if user is not authenticated, otherwise shows Dashboard.
 * 
 * Authentication is determined by checking for JWT token in localStorage.
 */
function App() {
  // State for authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  /**
   * Check authentication status on component mount
   * Verifies if JWT token exists in localStorage
   */
  useEffect(() => {
    // Check for token in localStorage
    const token = getAuthToken();
    
    // Update authentication state based on token presence
    setIsAuthenticated(!!token);
    
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
   * Render Login or Dashboard based on authentication status
   * - Not authenticated: Show Login page
   * - Authenticated: Show Dashboard
   */
  return (
    <div className="app">
      {isAuthenticated ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;
