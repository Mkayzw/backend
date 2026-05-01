import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const config = {
  IMPROVING: { icon: TrendingUp,   color: 'var(--trend-improving)', label: 'Improving' },
  STABLE:    { icon: Minus,        color: 'var(--trend-stable)',    label: 'Stable' },
  WORSENING: { icon: TrendingDown, color: 'var(--trend-worsening)', label: 'Worsening' },
};

export default function TrendIndicator({ status, showLabel = true }) {
  const c = config[status] || config.STABLE;
  const Icon = c.icon;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c.color, fontWeight: 500, fontSize: '0.82rem' }}>
      <Icon size={16} />
      {showLabel && c.label}
    </span>
  );
}
