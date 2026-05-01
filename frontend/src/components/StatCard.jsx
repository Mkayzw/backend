import { useEffect, useState } from 'react';
import './StatCard.css';

export default function StatCard({ icon: Icon, label, value, color = 'blue', delay = 0, subtitle }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`stat-card stat-card--${color} ${show ? 'stat-card--visible' : ''}`}>
      <div className="stat-card__icon-wrap">
        <Icon size={22} />
      </div>
      <div className="stat-card__content">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
        {subtitle && <span className="stat-card__subtitle">{subtitle}</span>}
      </div>
      <div className="stat-card__glow" />
    </div>
  );
}
