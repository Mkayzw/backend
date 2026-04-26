import { useState } from 'react';
import '../styles/PatientList.css';

/**
 * PatientList Component
 * 
 * Displays a scrollable list of prioritized patients with risk levels,
 * trend indicators, and clinical information. Allows selection of patients
 * to view detailed trend data.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.patients - Array of patient objects
 * @param {Function} props.onPatientClick - Callback function when patient is clicked
 */
function PatientList({ patients, onPatientClick }) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  /**
   * Gets the color for risk level badge
   * RED for HIGH, YELLOW for MEDIUM, GREEN for LOW
   */
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return '#ef4444'; // Red
      case 'MEDIUM':
        return '#f59e0b'; // Yellow
      case 'LOW':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };
  
  /**
   * Gets the trend indicator symbol
   * ↑ for IMPROVING, → for STABLE, ↓ for WORSENING
   */
  const getTrendIndicator = (trendStatus) => {
    switch (trendStatus) {
      case 'IMPROVING':
        return '↑';
      case 'STABLE':
        return '→';
      case 'WORSENING':
        return '↓';
      default:
        return '→';
    }
  };
  
  /**
   * Gets the color for trend indicator
   */
  const getTrendColor = (trendStatus) => {
    switch (trendStatus) {
      case 'IMPROVING':
        return '#10b981'; // Green
      case 'STABLE':
        return '#6b7280'; // Gray
      case 'WORSENING':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };
  
  /**
   * Formats ISO date string to relative time
   * e.g., "2 hours ago", "1 day ago"
   */
  const formatRelativeTime = (isoDateString) => {
    if (!isoDateString) return 'Unknown';
    
    const date = new Date(isoDateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };
  
  /**
   * Parses chronic conditions from JSON string or array
   */
  const parseChronicConditions = (chronicConditions) => {
    if (!chronicConditions) return [];
    
    // If it's already an array, return it
    if (Array.isArray(chronicConditions)) {
      return chronicConditions;
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof chronicConditions === 'string') {
      try {
        const parsed = JSON.parse(chronicConditions);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        // If parsing fails, return empty array
        return [];
      }
    }
    
    return [];
  };
  
  /**
   * Handles patient card click
   */
  const handlePatientClick = (patient) => {
    setSelectedPatientId(patient.id);
    if (onPatientClick) {
      onPatientClick(patient);
    }
  };
  
  // Handle empty patient list
  if (!patients || patients.length === 0) {
    return (
      <div className="patient-list-empty">
        <div className="patient-list-empty-icon">👥</div>
        <div className="patient-list-empty-text">No patients to display</div>
      </div>
    );
  }
  
  return (
    <div className="patient-list">
      {patients.map((patient) => {
        const conditions = parseChronicConditions(patient.chronicConditions);
        const isSelected = selectedPatientId === patient.id;
        const riskColor = getRiskLevelColor(patient.currentRiskLevel);
        const trendIndicator = getTrendIndicator(patient.currentTrendStatus);
        const trendColor = getTrendColor(patient.currentTrendStatus);
        
        return (
          <div
            key={patient.id}
            className={`patient-card ${isSelected ? 'patient-card-selected' : ''}`}
            onClick={() => handlePatientClick(patient)}
          >
            <div className="patient-card-header">
              <div className="patient-card-name">
                {patient.fullName}
              </div>
              <div className="patient-card-badges">
                <div
                  className="patient-card-risk-badge"
                  style={{
                    backgroundColor: `${riskColor}15`,
                    color: riskColor
                  }}
                >
                  {patient.currentRiskLevel}
                </div>
                <div
                  className="patient-card-trend-indicator"
                  style={{ color: trendColor }}
                  title={patient.currentTrendStatus}
                >
                  {trendIndicator}
                </div>
              </div>
            </div>
            
            <div className="patient-card-info">
              <div className="patient-card-info-item">
                <span className="patient-card-info-label">Last Report:</span>
                <span className="patient-card-info-value">
                  {formatRelativeTime(patient.lastReportTime)}
                </span>
              </div>
              
              {conditions.length > 0 && (
                <div className="patient-card-info-item">
                  <span className="patient-card-info-label">Conditions:</span>
                  <span className="patient-card-info-value">
                    {conditions.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PatientList;
