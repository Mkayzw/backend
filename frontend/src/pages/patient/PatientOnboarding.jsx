import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { patientsAPI } from '../../api/patients';
import { usersAPI } from '../../api/users';
import {
  Heart, User, Phone, Calendar, MapPin, Shield, AlertCircle,
  ChevronRight, ChevronLeft, CheckCircle2, Info, Pill, Stethoscope
} from 'lucide-react';
import './PatientOnboarding.css';

const COMMON_CONDITIONS = [
  'asthma', 'copd', 'diabetes', 'hypertension', 'heart_disease', 'epilepsy',
  'chronic_kidney_disease', 'cancer', 'pregnancy', 'immunocompromised',
  'mental_health', 'stroke_history',
];

const formatLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const STEPS = [
  { label: 'Personal', icon: User },
  { label: 'Medical', icon: Shield },
  { label: 'Complete', icon: CheckCircle2 },
];

/**
 * Checks whether a patient's profile has critical missing data
 * (i.e., placeholder values set during auto-creation on signup).
 */
export function isProfileIncomplete(patient) {
  if (!patient) return true;

  // Emergency contact is empty string on auto-create
  if (!patient.emergencyContact || !patient.emergencyContact.trim()) return true;

  // Gender is placeholder on auto-create
  if (!patient.gender || patient.gender === 'Prefer not to say') return true;

  // Date of birth is set to "now" on auto-create — check if it's clearly a placeholder
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    const now = new Date();
    // If DOB is within the last 24 hours, it's the auto-generated placeholder
    if (Math.abs(now - dob) < 24 * 60 * 60 * 1000) return true;
    // If DOB is in the future, it's invalid
    if (dob > now) return true;
    // If the person would be under 1 year old based on DOB, likely placeholder
    const ageMs = now - dob;
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 1) return true;
  } else {
    return true;
  }

  return false;
}

export default function PatientOnboarding({ patient, onComplete }) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    dateOfBirth: '',
    gender: '',
    phone: user?.phone || '',
    emergencyContact: '',
    address: '',
    chronicConditions: [],
    allergies: '',
    baselineStatus: 'stable',
  });

  const update = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors(fe => ({ ...fe, [key]: '' }));
  };

  const toggleCondition = (condition) => {
    setForm(f => ({
      ...f,
      chronicConditions: f.chronicConditions.includes(condition)
        ? f.chronicConditions.filter(c => c !== condition)
        : [...f.chronicConditions, condition]
    }));
  };

  // ── Step 1 Validation: Personal Info ──
  const validateStep1 = () => {
    const errors = {};

    if (!form.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(form.dateOfBirth);
      const now = new Date();
      if (dob > now) errors.dateOfBirth = 'Date of birth cannot be in the future';
      const ageYears = (now - dob) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 1) errors.dateOfBirth = 'Please enter a valid date of birth';
      if (ageYears > 130) errors.dateOfBirth = 'Please enter a valid date of birth';
    }

    if (!form.gender) {
      errors.gender = 'Please select your gender';
    }

    if (!form.emergencyContact.trim()) {
      errors.emergencyContact = 'Emergency contact is required';
    } else if (form.emergencyContact.trim().length < 3) {
      errors.emergencyContact = 'Please enter a valid contact (name + number)';
    }

    if (!form.address.trim()) {
      errors.address = 'Address is required';
    }

    if (form.phone && !/^\+?[\d\s\-()]+$/.test(form.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Step 2 Validation: Medical Info ──
  const validateStep2 = () => {
    const errors = {};

    if (!form.allergies.trim()) {
      errors.allergies = 'Please enter allergies or type "None known"';
    }

    if (!form.baselineStatus) {
      errors.baselineStatus = 'Please select your baseline status';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setFieldErrors({});
    setStep(s => s - 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        patientsAPI.update(patient.id, {
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          emergencyContact: form.emergencyContact,
          address: form.address,
          chronicConditions: form.chronicConditions,
          allergies: form.allergies.split(',').map(a => a.trim()).filter(a => a),
          baselineStatus: form.baselineStatus,
        }),
        form.phone
          ? usersAPI.update(user.id, { phone: form.phone })
          : Promise.resolve(),
      ]);

      success('Profile completed successfully! Welcome to MedWatch.');
      // Advance to completion screen briefly, then call onComplete
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      toastError('Failed to save profile: ' + (err.message || 'Unknown error'));
      setSaving(false);
    }
  };

  const renderField = (key, label, type = 'text', props = {}) => (
    <div className={`form-group ${props.full ? 'form-group--full' : ''}`}>
      <label className="form-label">{label}</label>
      {type === 'select' ? (
        <select
          className={`form-select ${fieldErrors[key] ? 'input-error' : ''}`}
          value={form[key]}
          onChange={update(key)}
        >
          {props.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className={`form-input ${fieldErrors[key] ? 'input-error' : ''}`}
          placeholder={props.placeholder || ''}
          value={form[key]}
          onChange={update(key)}
        />
      )}
      {fieldErrors[key] && (
        <span className="onboarding-field-error">
          <AlertCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {fieldErrors[key]}
        </span>
      )}
    </div>
  );

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-icon-wrap">
            <Heart size={28} />
          </div>
          <h1 className="onboarding-title">Complete Your Profile</h1>
          <p className="onboarding-subtitle">
            Welcome, {user?.fullName || 'Patient'}! We need a few details to personalize your health monitoring experience.
          </p>
        </div>

        {/* Stepper */}
        {step < 2 && (
          <div className="onboarding-stepper">
            {STEPS.map((s, idx) => (
              <div className="stepper-step" key={s.label}>
                <div className={`stepper-dot ${
                  idx === step ? 'stepper-dot--active' :
                  idx < step ? 'stepper-dot--completed' : ''
                }`}>
                  {idx < step ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`stepper-line ${idx < step ? 'stepper-line--completed' : ''}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Personal Information */}
        {step === 0 && (
          <div className="onboarding-step">
            <h3 className="onboarding-step-title">
              <User size={18} style={{ color: 'var(--color-primary)' }} />
              Personal Information
            </h3>

            <div className="onboarding-info">
              <Info size={16} />
              <p>This information is essential for your clinical care and emergency situations.</p>
            </div>

            <div className="onboarding-form-grid">
              {renderField('dateOfBirth', 'Date of Birth *', 'date')}
              {renderField('gender', 'Gender *', 'select', {
                options: [
                  { value: '', label: 'Select...' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]
              })}
              {renderField('phone', 'Phone Number', 'tel', { placeholder: '+263-77-000-0000' })}
              {renderField('emergencyContact', 'Emergency Contact *', 'text', { placeholder: 'Name + phone number' })}
              {renderField('address', 'Address *', 'text', { placeholder: 'Your current address', full: true })}
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-primary" onClick={handleNext}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Medical Information */}
        {step === 1 && (
          <div className="onboarding-step">
            <h3 className="onboarding-step-title">
              <Shield size={18} style={{ color: 'var(--color-primary)' }} />
              Medical Information
            </h3>

            <div className="onboarding-info">
              <Info size={16} />
              <p>Help your clinicians understand your medical background for better monitoring and alerts.</p>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Chronic Conditions (select any that apply)</label>
              <div className="onboarding-chip-grid">
                {COMMON_CONDITIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`onboarding-chip ${form.chronicConditions.includes(c) ? 'onboarding-chip--active' : ''}`}
                    onClick={() => toggleCondition(c)}
                  >
                    {formatLabel(c)}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding-form-grid">
              {renderField('allergies', 'Allergies *', 'text', {
                placeholder: 'e.g. penicillin, peanuts, or "None known"',
                full: true
              })}
              {renderField('baselineStatus', 'Current Health Baseline *', 'select', {
                options: [
                  { value: '', label: 'Select...' },
                  { value: 'stable', label: 'Stable — Generally healthy' },
                  { value: 'fragile', label: 'Fragile — Has active health concerns' },
                  { value: 'unknown', label: 'Unknown — Not sure' },
                ],
                full: true
              })}
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-secondary" onClick={handleBack}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={() => { if (validateStep2()) handleSave(); }} disabled={saving}>
                {saving ? 'Saving...' : <>Complete Setup <CheckCircle2 size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Completion */}
        {step === 2 && (
          <div className="onboarding-complete">
            <div className="onboarding-complete-icon">
              <CheckCircle2 size={40} />
            </div>
            <h2>You're All Set!</h2>
            <p>
              Your profile has been completed. You'll be redirected to your health dashboard in a moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
