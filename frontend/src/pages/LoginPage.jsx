import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import './LoginPage.css';

const TEST_ACCOUNTS = [
  { label: 'Admin', email: 'admin@telemed.local', password: 'Admin123!', role: 'ADMIN' },
  { label: 'Clinician', email: 'clinician.cardiology@telemed.local', password: 'Clinician123!', role: 'CLINICIAN' },
  { label: 'Patient', email: 'patient.asthma@telemed.local', password: 'Patient123!', role: 'PATIENT' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const roleRoutes = { PATIENT: '/patient', CLINICIAN: '/clinician', ADMIN: '/admin' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(roleRoutes[user.role] || '/');
    } catch (err) {
      setError(err.message || 'Login failed');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="login-page">
      <div className={`login-card animate-scale-in ${shake ? 'animate-shake' : ''}`}>
        <div className="login-header">
          <div className="login-logo">
            <Heart size={28} />
          </div>
          <h1 className="login-title">MedWatch</h1>
          <p className="login-desc">Remote Patient Monitoring System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="login-input-wrap">
              <Mail size={18} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                className="form-input login-input"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="login-input-wrap">
              <Lock size={18} className="login-input-icon" />
              <input
                id="login-password"
                type="password"
                className="form-input login-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading} id="login-submit">
            {loading ? 'Signing in...' : <>Sign In <LogIn size={16} /></>}
          </button>
        </form>

        <div className="login-divider">
          <span>Quick Access — Demo Accounts</span>
        </div>

        <div className="login-quick-access">
          {TEST_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              className="login-quick-btn"
              onClick={() => fillCredentials(acc)}
              type="button"
            >
              <span className={`login-quick-role login-quick-role--${acc.role.toLowerCase()}`}>{acc.role}</span>
              <span className="login-quick-label">{acc.label}</span>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>

        <p className="login-footer-text">
          Don't have an account? <Link to="/signup" className="login-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
