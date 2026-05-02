import { Bell, BellOff, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import './AlertCard.css';

const priorityConfig = {
  HIGH:   { icon: AlertTriangle, className: 'alert-card--high' },
  MEDIUM: { icon: AlertCircle,   className: 'alert-card--medium' },
  LOW:    { icon: Info,           className: 'alert-card--low' },
};

function parseAlertMessage(message) {
  if (!message) return { summary: '', factors: [] };
  const [summary, reasoningLine] = message.split('\nReasoning:');
  const factors = reasoningLine
    ? reasoningLine.split(/\s*\|\s*/).map(s => s.trim()).filter(Boolean)
    : [];
  return { summary: summary.trim(), factors };
}

export default function AlertCard({ alert, onMarkRead }) {
  const config = priorityConfig[alert.priority] || priorityConfig.LOW;
  const Icon = config.icon;
  const time = new Date(alert.createdAt).toLocaleString();
  const patientName = alert.patient?.user?.fullname || alert.patient?.user?.fullName || `Patient #${alert.patientId}`;
  const { summary, factors } = parseAlertMessage(alert.message);

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
          <span className="alert-card__type">{alert.alertType?.replace(/_/g, ' ')} for {patientName}</span>
          <span className="alert-card__time">{time}</span>
        </div>
        {summary && <p className="alert-card__summary">{summary}</p>}
        {factors.length > 0 && (
          <div className="alert-card__factors">
            {factors.map((f, i) => (
              <span key={i} className="factor-tag">{f}</span>
            ))}
          </div>
        )}
      </div>
      {!alert.isRead && onMarkRead && (
        <button className="btn btn-ghost btn-sm alert-card__action" onClick={() => onMarkRead(alert.id)} title="Mark as read">
          <BellOff size={15} />
        </button>
      )}
    </div>
  );
}
