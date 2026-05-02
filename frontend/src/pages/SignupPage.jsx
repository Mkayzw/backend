import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Mail, Lock, User, Phone, Stethoscope, UserPlus } from 'lucide-react';
import './LoginPage.css';

export default function SignupPage() {
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '', role: 'PATIENT', specialization: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const roleRoutes = { PATIENT: '/patient', CLINICIAN: '/clinician', ADMIN: '/admin' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = { ...form };
      if (data.role !== 'CLINICIAN') delete data.specialization;
      const user = await signup(data);
      navigate(roleRoutes[user.role] || '/');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

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
            <div className="login-input-wrap">
              <User size={18} className="login-input-icon" />
              <input id="signup-name" className="form-input login-input" placeholder="Your full name" value={form.fullName} onChange={update('fullName')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="login-input-wrap">
              <Mail size={18} className="login-input-icon" />
              <input id="signup-email" type="email" className="form-input login-input" placeholder="your@email.com" value={form.email} onChange={update('email')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="login-input-wrap">
              <Lock size={18} className="login-input-icon" />
              <input id="signup-password" type="password" className="form-input login-input" placeholder="Min 8 chars, letter + number" value={form.password} onChange={update('password')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <div className="login-input-wrap">
              <Phone size={18} className="login-input-icon" />
              <input id="signup-phone" className="form-input login-input" placeholder="+263-77-000-0000" value={form.phone} onChange={update('phone')} />
            </div>
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
              <div className="login-input-wrap">
                <Stethoscope size={18} className="login-input-icon" />
                <input id="signup-spec" className="form-input login-input" placeholder="e.g. Cardiology" value={form.specialization} onChange={update('specialization')} required />
              </div>
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
