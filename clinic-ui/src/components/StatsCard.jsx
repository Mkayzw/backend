import React from 'react';
import '../styles/StatsCard.css';

/**
 * StatsCard Component
 * 
 * Displays a single metric with icon, value, and label.
 * Used in the dashboard to show key statistics like total patients,
 * appointments today, high risk alerts, etc.
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Descriptive label for the metric (e.g., "Total Patients")
 * @param {number|string} props.value - The metric value to display
 * @param {string} props.icon - Icon identifier or emoji to display
 * @param {string} props.color - Accent color for the card (e.g., "#2563eb", "#10b981")
 */
function StatsCard({ label, value, icon, color }) {
  return (
    <div className="stats-card">
      <div 
        className="stats-card-icon" 
        style={{ backgroundColor: color ? `${color}15` : '#2563eb15' }}
      >
        <span style={{ color: color || '#2563eb' }}>
          {icon}
        </span>
      </div>
      
      <div className="stats-card-content">
        <div className="stats-card-value">
          {value}
        </div>
        <div className="stats-card-label">
          {label}
        </div>
      </div>
    </div>
  );
}

export default StatsCard;
