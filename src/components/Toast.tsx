import { useEffect, useState } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration ?? 3000);
    return () => clearTimeout(timer);
  }, []);

  const config = {
    success: { icon: <Check size={15} />, bg: 'var(--orion-green)', color: '#fff' },
    error:   { icon: <X size={15} />,     bg: 'var(--orion-red)',   color: '#fff' },
    warning: { icon: <AlertTriangle size={15} />, bg: '#f59e0b', color: '#fff' },
    info:    { icon: <Info size={15} />,  bg: 'var(--orion-accent)', color: '#fff' },
  }[toast.type];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      background: 'var(--orion-surface)',
      border: `1.5px solid ${config.bg}`,
      borderLeft: `4px solid ${config.bg}`,
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      minWidth: 240, maxWidth: 360,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.25s ease',
      cursor: 'pointer',
    }} onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}>
      <div style={{ color: config.bg, flexShrink: 0 }}>{config.icon}</div>
      <span style={{ fontSize: 13, color: 'var(--orion-text)', flex: 1 }}>{toast.message}</span>
      <X size={13} style={{ color: 'var(--orion-text-mute)', flexShrink: 0 }} />
    </div>
  );
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 99999,
    }}>
      {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
}
