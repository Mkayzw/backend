import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 48, text = 'Loading...' }) {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner" style={{ width: size, height: size }}>
        <div className="spinner-ring" />
        <div className="spinner-cross">
          <div className="cross-v" />
          <div className="cross-h" />
        </div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}
