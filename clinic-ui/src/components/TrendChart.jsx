import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchPatientTrend } from '../api/client';
import '../styles/TrendChart.css';

/**
 * TrendChart Component
 * 
 * Displays patient symptom trend data over time using a line chart.
 * Shows risk score progression with color-coded visualization based on risk levels.
 * 
 * @param {Object} props - Component props
 * @param {number} props.patientId - ID of the patient to display trend data for
 * @param {string} props.patientName - Name of the patient for chart title
 */
function TrendChart({ patientId, patientName }) {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Fetches trend data when component mounts or patientId changes
   */
  useEffect(() => {
    if (!patientId) {
      setTrendData([]);
      return;
    }
    
    const loadTrendData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchPatientTrend(patientId);
        
        // Transform data for Recharts
        const transformedData = data.map((point) => ({
          date: formatDate(point.date),
          fullDate: point.date,
          riskScore: point.riskScore,
          riskLevel: point.riskLevel,
          severity: point.severity,
          symptoms: point.symptoms || []
        }));
        
        setTrendData(transformedData);
      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError(err.message || 'Failed to load trend data');
      } finally {
        setLoading(false);
      }
    };
    
    loadTrendData();
  }, [patientId]);
  
  /**
   * Formats ISO date string to readable format
   * e.g., "Jan 15, 10:30 AM"
   */
  const formatDate = (isoDateString) => {
    if (!isoDateString) return '';
    
    const date = new Date(isoDateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${month} ${day}, ${time}`;
  };
  
  /**
   * Gets line color based on risk score
   * Creates gradient effect: green (0-33) → yellow (34-66) → red (67-100)
   */
  const getLineColor = (riskScore) => {
    if (riskScore <= 33) return '#10b981'; // Green (LOW)
    if (riskScore <= 66) return '#f59e0b'; // Yellow (MEDIUM)
    return '#ef4444'; // Red (HIGH)
  };
  
  /**
   * Custom tooltip component for chart
   */
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) {
      return null;
    }
    
    const data = payload[0].payload;
    const riskColor = getLineColor(data.riskScore);
    
    return (
      <div className="trend-chart-tooltip">
        <div className="trend-chart-tooltip-header">
          <div className="trend-chart-tooltip-date">{data.date}</div>
        </div>
        
        <div className="trend-chart-tooltip-content">
          <div className="trend-chart-tooltip-item">
            <span className="trend-chart-tooltip-label">Risk Score:</span>
            <span 
              className="trend-chart-tooltip-value"
              style={{ color: riskColor, fontWeight: 700 }}
            >
              {data.riskScore}
            </span>
          </div>
          
          <div className="trend-chart-tooltip-item">
            <span className="trend-chart-tooltip-label">Risk Level:</span>
            <span 
              className="trend-chart-tooltip-value"
              style={{ color: riskColor, fontWeight: 600 }}
            >
              {data.riskLevel}
            </span>
          </div>
          
          <div className="trend-chart-tooltip-item">
            <span className="trend-chart-tooltip-label">Severity:</span>
            <span className="trend-chart-tooltip-value">
              {data.severity}
            </span>
          </div>
          
          {data.symptoms && data.symptoms.length > 0 && (
            <div className="trend-chart-tooltip-item">
              <span className="trend-chart-tooltip-label">Symptoms:</span>
              <span className="trend-chart-tooltip-value">
                {data.symptoms.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  /**
   * Custom dot component for line chart
   * Colors dots based on risk level
   */
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    const color = getLineColor(payload.riskScore);
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
      />
    );
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="trend-chart-container">
        <div className="trend-chart-header">
          <h3 className="trend-chart-title">
            Risk Trend - {patientName}
          </h3>
        </div>
        <div className="trend-chart-loading">
          <div className="trend-chart-spinner"></div>
          <div className="trend-chart-loading-text">Loading trend data...</div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="trend-chart-container">
        <div className="trend-chart-header">
          <h3 className="trend-chart-title">
            Risk Trend - {patientName}
          </h3>
        </div>
        <div className="trend-chart-error">
          <div className="trend-chart-error-icon">⚠️</div>
          <div className="trend-chart-error-text">{error}</div>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (!trendData || trendData.length === 0) {
    return (
      <div className="trend-chart-container">
        <div className="trend-chart-header">
          <h3 className="trend-chart-title">
            Risk Trend - {patientName}
          </h3>
        </div>
        <div className="trend-chart-empty">
          <div className="trend-chart-empty-icon">📊</div>
          <div className="trend-chart-empty-text">No trend data available</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="trend-chart-container">
      <div className="trend-chart-header">
        <h3 className="trend-chart-title">
          Risk Trend - {patientName}
        </h3>
        <div className="trend-chart-legend">
          <div className="trend-chart-legend-item">
            <div className="trend-chart-legend-dot" style={{ backgroundColor: '#10b981' }}></div>
            <span className="trend-chart-legend-label">Low (0-33)</span>
          </div>
          <div className="trend-chart-legend-item">
            <div className="trend-chart-legend-dot" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="trend-chart-legend-label">Medium (34-66)</span>
          </div>
          <div className="trend-chart-legend-item">
            <div className="trend-chart-legend-dot" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="trend-chart-legend-label">High (67-100)</span>
          </div>
        </div>
      </div>
      
      <div className="trend-chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={trendData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            
            <XAxis
              dataKey="date"
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            
            <YAxis
              domain={[0, 100]}
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
              label={{ 
                value: 'Risk Score', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#64748b', fontSize: 14, fontWeight: 500 }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Line
              type="monotone"
              dataKey="riskScore"
              stroke="#2563eb"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendChart;
