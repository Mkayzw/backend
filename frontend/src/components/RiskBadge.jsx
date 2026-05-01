import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

const config = {
  LOW:    { className: 'badge-success', icon: ShieldCheck, label: 'Low' },
  MEDIUM: { className: 'badge-warning', icon: Shield,      label: 'Medium' },
  HIGH:   { className: 'badge-danger',  icon: ShieldAlert,  label: 'High' },
};

export default function RiskBadge({ level, showIcon = true }) {
  const c = config[level] || config.LOW;
  const Icon = c.icon;

  return (
    <span className={`badge ${c.className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {showIcon && <Icon size={13} />}
      {c.label}
    </span>
  );
}
