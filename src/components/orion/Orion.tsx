// =========================================================================
// Orion — React components (TypeScript-friendly, no deps)
// Drop into your project: import { OrionLogo, KPI, Btn, Chip, Tabs, ... }
// All components consume the CSS variables defined in orion.css.
// =========================================================================
import React from 'react';

type Color = string;

// ── Brand mark ──────────────────────────────────────────────────────────
export const OrionMark = ({
  size = 24, color = 'currentColor', accent,
}: { size?: number; color?: Color; accent?: Color }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
    <circle cx="16" cy="16" r="14.5" stroke={color} strokeWidth="1.5" opacity="1" />
    <path d="M16 1V5M16 27V31M1 16H5M27 16H31" stroke={color} strokeWidth="1.5" opacity="1" />
    <circle cx="9.5"  cy="18.2" r="2" fill={accent || color} />
    <circle cx="16"   cy="16"   r="2" fill={accent || color} />
    <circle cx="22.5" cy="13.8" r="2" fill={accent || color} />
  </svg>
);

export const OrionLogo = ({
  height = 16, color, accent,
}: { height?: number; color?: Color; accent?: Color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: height * 0.6,
    color: color || 'var(--orion-text)', lineHeight: 1,
  }}>
    <OrionMark size={height * 1.4} color={color || 'currentColor'} accent={accent || 'var(--orion-accent)'} />
    <span style={{
      fontFamily: 'var(--orion-font-ui)', fontWeight: 800,
      fontSize: height, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: color || 'var(--orion-text)',
    }}>Orion</span>
  </span>
);

// ── Atoms ───────────────────────────────────────────────────────────────
export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="o-eyebrow">{children}</div>
);

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost'; size?: 'sm' | 'md' }
> = ({ variant = 'default', size = 'md', className = '', ...rest }) => (
  <button
    className={[
      'o-btn',
      variant === 'primary' ? 'o-btn--primary' : '',
      variant === 'ghost'   ? 'o-btn--ghost'   : '',
      size === 'sm' ? 'o-btn--sm' : '',
      className,
    ].join(' ').trim()}
    {...rest}
  />
);

export const Chip: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button className="o-chip" aria-pressed={active} onClick={onClick}>{children}</button>
);

// ── KPI card ────────────────────────────────────────────────────────────
export const KPI: React.FC<{
  label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean;
}> = ({ label, value, sub, accent }) => (
  <div className="o-kpi">
    <span className="o-kpi__label">{label}</span>
    <span className={'o-kpi__value' + (accent ? ' o-kpi__value--accent' : '')}>{value}</span>
    {sub && <span className="o-kpi__sub">{sub}</span>}
  </div>
);

// ── Tabs ────────────────────────────────────────────────────────────────
export const Tabs: React.FC<{
  items: { id: string; label: React.ReactNode }[]; value: string; onChange: (id: string) => void;
}> = ({ items, value, onChange }) => (
  <div className="o-tabs" role="tablist">
    {items.map(it => (
      <button
        key={it.id} role="tab"
        aria-selected={value === it.id}
        className={'o-tab' + (value === it.id ? ' is-active' : '')}
        onClick={() => onChange(it.id)}
      >{it.label}</button>
    ))}
  </div>
);

// ── Result chip (W/D/L) ─────────────────────────────────────────────────
export const Result: React.FC<{ r: 'W' | 'D' | 'L' }> = ({ r }) => (
  <span className={'o-result o-result--' + r.toLowerCase()}>{r}</span>
);

// ── Card ────────────────────────────────────────────────────────────────
export const Card: React.FC<{
  kicker?: string; title?: React.ReactNode; right?: React.ReactNode;
  children?: React.ReactNode; className?: string;
}> = ({ kicker, title, right, children, className = '' }) => (
  <div className={'o-card ' + className}>
    {(kicker || title || right) && (
      <div className="o-card__header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          {kicker && <span className="o-eyebrow">{kicker}</span>}
          {title  && <span style={{ fontSize: 14 }}>{title}</span>}
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

// ── Modal ───────────────────────────────────────────────────────────────
export const Modal: React.FC<{
  open: boolean; onClose: () => void; title: React.ReactNode;
  children: React.ReactNode; footer?: React.ReactNode;
}> = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="o-modal-overlay" onClick={onClose}>
      <div className="o-modal" onClick={e => e.stopPropagation()}>
        <div className="o-modal__header">
          <span className="o-modal__title">{title}</span>
          <button className="o-btn o-btn--ghost o-btn--sm" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="o-modal__body">{children}</div>
        {footer && <div className="o-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

// ── Form field ──────────────────────────────────────────────────────────
export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <span className="o-field-label">{label}</span>
    {children}
  </label>
);

// ── Top bar ─────────────────────────────────────────────────────────────
export const TopBar: React.FC<{
  user?: string; tabs?: { id: string; label: string }[]; activeTab?: string;
  onTabChange?: (id: string) => void; right?: React.ReactNode;
}> = ({ tabs, activeTab, onTabChange, right }) => (
  <header className="o-topbar">
    <OrionLogo height={15} />
    <span className="o-divider-v" />
    {tabs && (
      <nav style={{ display: 'flex', gap: 22 }}>
        {tabs.map(t => (
          <button key={t.id}
            className={'o-tab' + (activeTab === t.id ? ' is-active' : '')}
            style={{ padding: '4px 0', borderBottom: 'none' }}
            onClick={() => onTabChange?.(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    )}
    <span style={{ flex: 1 }} />
    {right}
  </header>
);
