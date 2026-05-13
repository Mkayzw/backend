import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [touched, setTouched] = useState({});

  const { login } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const roleRoutes = { PATIENT: '/patient', CLINICIAN: '/clinician', ADMIN: '/admin' };

  const validate = () => {
    const errors = {};

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    } else if (email.length > 254) {
      errors.email = 'Email address is too long';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[A-Za-z])/.test(password)) {
      errors.password = 'Password must contain at least one letter';
    } else if (!/(?=.*\d)/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time validation on blur
  const validateField = (field) => {
    const errors = { ...fieldErrors };

    if (field === 'email') {
      if (!email.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = 'Please enter a valid email address';
      } else {
        delete errors.email;
      }
    }

    if (field === 'password') {
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
        errors.password = 'Password must contain a letter and a number';
      } else {
        delete errors.password;
      }
    }

    setFieldErrors(errors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ email: true, password: true });
    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(roleRoutes[user.role] || '/');
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      toastError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
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

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {error && (
            <div className="login-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginRight: 8 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <div className={`login-input-wrap ${fieldErrors.email ? 'login-input-wrap--error' : ''}`}>
              <Mail size={18} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                className={`form-input login-input ${fieldErrors.email ? 'input-error' : ''}`}
                placeholder="Enter your email"
                value={email}
                autoComplete="email"
                onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(f => ({ ...f, email: '' })); }}
                onBlur={() => { setTouched(t => ({ ...t, email: true })); if (touched.email) validateField('email'); }}
              />
            </div>
            {fieldErrors.email && <span className="field-error"><AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className={`login-input-wrap ${fieldErrors.password ? 'login-input-wrap--error' : ''}`}>
              <Lock size={18} className="login-input-icon" />
              <input
                id="login-password"
                type="password"
                className={`form-input login-input ${fieldErrors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                value={password}
                autoComplete="current-password"
                onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(f => ({ ...f, password: '' })); }}
                onBlur={() => { setTouched(t => ({ ...t, password: true })); if (touched.password) validateField('password'); }}
              />
            </div>
            {fieldErrors.password && <span className="field-error"><AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{fieldErrors.password}</span>}
            {!fieldErrors.password && password && password.length > 0 && password.length < 8 && touched.password && (
              <span className="field-hint">{password.length}/8 characters minimum</span>
            )}
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading} id="login-submit">
            {loading ? 'Signing in...' : <>Sign In <LogIn size={16} /></>}
          </button>
        </form>

        <p className="login-footer-text">
          Don't have an account? <Link to="/signup" className="login-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
