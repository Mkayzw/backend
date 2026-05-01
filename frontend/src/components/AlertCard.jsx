import { Bell, BellOff, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import './AlertCard.css';

const priorityConfig = {
  HIGH:   { icon: AlertTriangle, className: 'alert-card--high' },
  MEDIUM: { icon: AlertCircle,   className: 'alert-card--medium' },
  LOW:    { icon: Info,           className: 'alert-card--low' },
};

export default function AlertCard({ alert, onMarkRead }) {
  const config = priorityConfig[alert.priority] || priorityConfig.LOW;
  const Icon = config.icon;
  const time = new Date(alert.createdAt).toLocaleString();

  return (
    <div className={`alert-card ${config.className} ${alert.isRead ? 'alert-card--read' : ''}`}>
      <div className="alert-card__icon">
        <Icon size={18} />
      </div>
      <div className="alert-card__body">
        <div className="alert-card__header">
          <span className={`badge ${alert.priority === 'HIGH' ? 'badge-danger' : alert.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>
            {alert.priority}
          </span>
          <span className="alert-card__type">{alert.alertType?.replace(/_/g, ' ')}</span>
          <span className="alert-card__time">{time}</span>
        </div>
        <p className="alert-card__message">{alert.message}</p>
      </div>
      {!alert.isRead && onMarkRead && (
        <button className="btn btn-ghost btn-sm alert-card__action" onClick={() => onMarkRead(alert.id)} title="Mark as read">
          <BellOff size={15} />
        </button>
      )}
    </div>
  );
}
