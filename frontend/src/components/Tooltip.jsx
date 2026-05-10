import { useState } from 'react';
import './Tooltip.css';

export default function Tooltip({ children, content, position = 'top' }) {
  const [visible, setVisible] = useState(false);

  if (!content) return children;

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`tooltip tooltip--${position}`} role="tooltip">
          {content}
          <div className="tooltip__arrow" />
        </div>
      )}
    </div>
  );
}
