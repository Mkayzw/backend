import { AlertCircle, AlertTriangle, BellRing, CheckCheck, Clock3, FilePlus2, Info, PauseCircle, Siren } from 'lucide-react';
import './AlertCard.css';

const priorityConfig = {
  HIGH: { icon: AlertTriangle, className: 'alert-card--high' },
  MEDIUM: { icon: AlertCircle, className: 'alert-card--medium' },
  LOW: { icon: Info, className: 'alert-card--low' },
};

function parseAlertMessage(message) {
  if (!message) return { summary: '', factors: [] };
  const [summary, reasoningLine] = message.split('\nReasoning:');
  const factors = reasoningLine
    ? reasoningLine.split(/\s*\|\s*/).map((item) => item.trim()).filter(Boolean)
    : [];
  return { summary: summary.trim(), factors };
}

function formatStatus(status) {
  return (status || 'NEW').replace(/_/g, ' ');
}

export default function AlertCard({ alert, onAction, onCreateTask }) {
  const config = priorityConfig[alert.priority] || priorityConfig.LOW;
  const Icon = config.icon;
  const time = new Date(alert.createdAt).toLocaleString();
  const patientName = alert.patient?.user?.fullname || alert.patient?.user?.fullName || `Patient #${alert.patientId}`;
  const ownerName =
    alert.assignedToClinician?.user?.fullname ||
    alert.assignedToClinician?.user?.fullName ||
    (alert.assignedToClinician?.fullName || null);
  const { summary, factors } = parseAlertMessage(alert.message);
  const canTransition = alert.status !== 'RESOLVED';

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
          <span className="badge badge-secondary">{formatStatus(alert.status)}</span>
          <span className="alert-card__type">{alert.alertType?.replace(/_/g, ' ')} for {patientName}</span>
          <span className="alert-card__time">{time}</span>
        </div>
        {summary && <p className="alert-card__summary">{summary}</p>}
        <div className="alert-card__meta">
          <span><BellRing size={14} /> Owner: {ownerName || 'Unclaimed'}</span>
          {alert.snoozedUntil && <span><PauseCircle size={14} /> Snoozed until {new Date(alert.snoozedUntil).toLocaleString()}</span>}
          {alert.resolvedAt && <span><CheckCheck size={14} /> Resolved {new Date(alert.resolvedAt).toLocaleString()}</span>}
        </div>
        {factors.length > 0 && (
          <div className="alert-card__factors">
            {factors.map((factor, index) => (
              <span key={index} className="factor-tag">{factor}</span>
            ))}
          </div>
        )}
        {alert.resolutionNote && (
          <div className="alert-card__note">
            <strong>Clinical note:</strong> {alert.resolutionNote}
          </div>
        )}
        <div className="alert-card__actions">
          {(alert.status === 'NEW' || alert.status === 'ESCALATED') && (
            <button className="btn btn-sm btn-primary" onClick={() => onAction?.(alert, 'ACKNOWLEDGE')}>
              <BellRing size={14} /> Acknowledge
            </button>
          )}
          {(alert.status === 'ACKNOWLEDGED' || alert.status === 'SNOOZED') && (
            <button className="btn btn-sm btn-secondary" onClick={() => onAction?.(alert, 'START')}>
              <Clock3 size={14} /> Start
            </button>
          )}
          {canTransition && (
            <button className="btn btn-sm btn-secondary" onClick={() => onAction?.(alert, 'ADD_NOTE')}>
              <Info size={14} /> Add Note
            </button>
          )}
          {canTransition && (
            <button className="btn btn-sm btn-secondary" onClick={() => onAction?.(alert, 'SNOOZE')}>
              <PauseCircle size={14} /> Snooze
            </button>
          )}
          {canTransition && (
            <button className="btn btn-sm btn-primary" onClick={() => onAction?.(alert, 'RESOLVE')}>
              <CheckCheck size={14} /> Resolve
            </button>
          )}
          {canTransition && (
            <button className="btn btn-sm btn-secondary" onClick={() => onAction?.(alert, 'ESCALATE')}>
              <Siren size={14} /> Escalate
            </button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={() => onCreateTask?.(alert)}>
            <FilePlus2 size={14} /> Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
