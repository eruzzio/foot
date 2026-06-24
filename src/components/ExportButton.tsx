import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, FileCode } from 'lucide-react';
import { MatchEventWithDetails } from '../types/database';
import { exportToCSV, exportToExcel, exportToOnceSport } from '../utils/exportData';
import { exportToSportsCodeXML } from '../utils/exportPro';

interface ExportButtonProps {
  events: MatchEventWithDetails[];
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  matchDate?: string;
  scoreA?: number;
  scoreB?: number;
  duration?: number;
  location?: string;
  competition?: string;
  teamALogoUrl?: string;
  teamBLogoUrl?: string;
  disabled?: boolean;
}

export default function ExportButton({ events, teamAName, teamBName, teamAColor, teamBColor, matchDate, scoreA, scoreB, duration, location, competition, teamALogoUrl, teamBLogoUrl, disabled }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 220); // 4 items × ~55px
    }
  }, [isOpen]);

  const exportData = {
    events,
    matchInfo: {
      teamA: teamAName, teamB: teamBName,
      teamAColor: teamAColor || '#22c55e', teamBColor: teamBColor || '#f97316',
      date: matchDate || new Date().toLocaleDateString('fr-FR'),
      scoreA, scoreB, duration, location, competition, teamALogoUrl, teamBLogoUrl,
    },
  };

  const handleExport = (format: 'csv' | 'excel' | 'xml' | 'oncesport') => {
    if (format === 'csv') exportToCSV(exportData);
    else if (format === 'excel') exportToExcel(exportData);
    else if (format === 'xml') exportToSportsCodeXML(exportData);
    else if (format === 'oncesport') exportToOnceSport(exportData);
    setIsOpen(false);
  };

  const formats = [
    { id: 'excel'     as const, label: 'Excel (.xlsx)',      desc: 'Avec statistiques',              icon: FileSpreadsheet, color: 'var(--orion-green)' },
    { id: 'csv'       as const, label: 'CSV (.csv)',          desc: 'Données brutes',                 icon: FileText,        color: 'var(--orion-accent)' },
    { id: 'xml'       as const, label: 'XML (.xml)',          desc: 'Compatible SportsCode/Nacsport',  icon: FileCode,        color: 'var(--orion-amber)' },
    { id: 'oncesport' as const, label: 'Once Sport (.csv)',   desc: 'Import direct Once Sport',        icon: FileText,        color: 'var(--orion-red)' },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || events.length === 0}
        className="o-btn o-btn--sm"
        style={{ opacity: disabled || events.length === 0 ? 0.4 : 1, cursor: disabled || events.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Download size={14} /> Exporter
      </button>

      {isOpen && !disabled && events.length > 0 && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setIsOpen(false)} />
          <div style={{
            position: 'fixed',
            right: 'auto',
            zIndex: 9999,
            width: 230,
            background: 'var(--orion-surface)',
            border: '1.5px solid var(--orion-line-strong)',
            borderRadius: 4,
            overflow: 'hidden',
            ...(btnRef.current ? (() => {
              const rect = btnRef.current.getBoundingClientRect();
              return openUpward
                ? { left: rect.right - 230, top: rect.top - 220 }
                : { left: rect.right - 230, top: rect.bottom + 4 };
            })() : {})
          }}>
            {formats.map((f, i) => {
              const Icon = f.icon;
              return (
                <button key={f.id} onClick={() => handleExport(f.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < formats.length - 1 ? '1px solid var(--orion-line)' : 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Icon size={15} style={{ color: f.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--orion-text)', fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--orion-text-mute)', marginTop: 2 }}>{f.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
