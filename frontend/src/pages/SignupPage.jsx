import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, Mail, Lock, User, Phone, Stethoscope, UserPlus } from 'lucide-react';
import './LoginPage.css';

export default function SignupPage() {
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '', role: 'PATIENT', specialization: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const roleRoutes = { PATIENT: '/patient', CLINICIAN: '/clinician', ADMIN: '/admin' };

  const update = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors(fe => ({ ...fe, [key]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Please enter a valid email';
    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) errors.password = 'Password must contain a letter and a number';
    if (form.phone && !/^\+?[\d\s\-()]+$/.test(form.phone)) errors.phone = 'Please enter a valid phone number';
    if (form.role === 'CLINICIAN' && !form.specialization.trim()) errors.specialization = 'Specialization is required for clinicians';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const data = { ...form };
      if (data.role !== 'CLINICIAN') delete data.specialization;
      const user = await signup(data);
      navigate(roleRoutes[user.role] || '/');
    } catch (err) {
      const msg = err.message || 'Signup failed';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-scale-in" style={{ maxWidth: 440 }}>
        <div className="login-header">
          <div className="login-logo">
            <Heart size={28} />
          </div>
          <h1 className="login-title">Create Account</h1>
          <p className="login-desc">Join MedWatch Patient Monitoring</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error"><span>{error}</span></div>}

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className={`login-input-wrap ${fieldErrors.fullName ? 'login-input-wrap--error' : ''}`}>
              <User size={18} className="login-input-icon" />
              <input id="signup-name" className={`form-input login-input ${fieldErrors.fullName ? 'input-error' : ''}`} placeholder="Your full name" value={form.fullName} onChange={update('fullName')} />
            </div>
            {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className={`login-input-wrap ${fieldErrors.email ? 'login-input-wrap--error' : ''}`}>
              <Mail size={18} className="login-input-icon" />
              <input id="signup-email" type="email" className={`form-input login-input ${fieldErrors.email ? 'input-error' : ''}`} placeholder="your@email.com" value={form.email} onChange={update('email')} />
            </div>
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className={`login-input-wrap ${fieldErrors.password ? 'login-input-wrap--error' : ''}`}>
              <Lock size={18} className="login-input-icon" />
              <input id="signup-password" type="password" className={`form-input login-input ${fieldErrors.password ? 'input-error' : ''}`} placeholder="Min 8 chars, letter + number" value={form.password} onChange={update('password')} />
            </div>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <div className={`login-input-wrap ${fieldErrors.phone ? 'login-input-wrap--error' : ''}`}>
              <Phone size={18} className="login-input-icon" />
              <input id="signup-phone" className={`form-input login-input ${fieldErrors.phone ? 'input-error' : ''}`} placeholder="+263-77-000-0000" value={form.phone} onChange={update('phone')} />
            </div>
            {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select id="signup-role" className="form-select" value={form.role} onChange={update('role')}>
              <option value="PATIENT">Patient</option>
              <option value="CLINICIAN">Clinician</option>
            </select>
          </div>

          {form.role === 'CLINICIAN' && (
            <div className="form-group animate-fade-in">
              <label className="form-label">Specialization</label>
              <div className={`login-input-wrap ${fieldErrors.specialization ? 'login-input-wrap--error' : ''}`}>
                <Stethoscope size={18} className="login-input-icon" />
                <input id="signup-spec" className={`form-input login-input ${fieldErrors.specialization ? 'input-error' : ''}`} placeholder="e.g. Cardiology" value={form.specialization} onChange={update('specialization')} />
              </div>
              {fieldErrors.specialization && <span className="field-error">{fieldErrors.specialization}</span>}
            </div>
          )}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading} id="signup-submit">
            {loading ? 'Creating account...' : <>Create Account <UserPlus size={16} /></>}
          </button>
        </form>

        <p className="login-footer-text">
          Already have an account? <Link to="/login" className="login-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
