import { useState } from 'react';
import { login } from '../api/client.js';
import '../styles/Login.css';

/**
 * Login Component
 * 
 * Provides user authentication interface with email and password inputs.
 * Handles form submission, loading states, and error display.
 * Redirects to /dashboard on successful authentication.
 */
function Login() {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State for error and loading
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  /**
   * Handles form submission
   * Calls login API and redirects to dashboard on success
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any existing errors
    setError('');
    
    // Set loading state
    setLoading(true);
    
    try {
      // Call login function from API client
      await login(email, password);
      
      // Redirect to dashboard on successful login
      window.location.href = '/dashboard';
      
    } catch (err) {
      // Display error message
      setError(err.message || 'Login failed. Please try again.');
      
    } finally {
      // Clear loading state
      setLoading(false);
    }
  };
  
  /**
   * Clears error when user starts typing
   */
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };
  
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) {
      setError('');
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            ⚕️
          </div>
          <h1>Clinic Dashboard</h1>
          <p>Sign in to access patient monitoring</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
