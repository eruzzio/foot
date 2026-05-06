import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, LayoutTemplate, Code, Monitor, Film } from 'lucide-react';
import { MatchEventWithDetails } from '../types/database';
import { exportToCSV, exportToExcel } from '../utils/exportData';
import { exportToPdf } from '../utils/exportPdf';
import { exportToSportsCodeXML, exportToDartfishCSV, exportToLongoMatchCSV } from '../utils/exportPro';

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

  const handleExport = (format: 'csv' | 'excel' | 'pdf' | 'sportscode' | 'dartfish' | 'longomatch') => {
    const exportData = {
      events,
      matchInfo: {
        teamA: teamAName,
        teamB: teamBName,
        teamAColor: teamAColor || '#22c55e',
        teamBColor: teamBColor || '#f97316',
        date: matchDate || new Date().toLocaleDateString('fr-FR'),
        scoreA,
        scoreB,
        duration,
        location,
        competition,
        teamALogoUrl,
        teamBLogoUrl,
      },
    };

    if (format === 'csv') {
      exportToCSV(exportData);
    } else if (format === 'excel') {
      exportToExcel(exportData);
    } else if (format === 'pdf') {
      exportToPdf(exportData);
    } else if (format === 'sportscode') {
      exportToSportsCodeXML(exportData);
    } else if (format === 'dartfish') {
      exportToDartfishCSV(exportData);
    } else if (format === 'longomatch') {
      exportToLongoMatchCSV(exportData);
    }

    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || events.length === 0}
        className="o-btn o-btn--sm"
        style={{
          opacity: disabled || events.length === 0 ? 0.4 : 1,
          cursor: disabled || events.length === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <Download size={14} />
        Exporter
      </button>

      {isOpen && !disabled && events.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div style={{ position:'absolute', right:0, marginTop:4, width:220, background:'var(--orion-surface)', border:'1px solid var(--orion-line-strong)', zIndex:20 }}>
            <button onClick={() => handleExport('pdf')}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--orion-line)', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LayoutTemplate size={15} style={{ color:'var(--orion-red)', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, color:'var(--orion-text)', fontWeight:500 }}>Fiche Stats PDF</div>
                <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>Rapport visuel staff</div>
              </div>
            </button>
            <button onClick={() => handleExport('excel')}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--orion-line)', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <FileSpreadsheet size={15} style={{ color:'var(--orion-green)', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, color:'var(--orion-text)', fontWeight:500 }}>Excel (.xlsx)</div>
                <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>Avec statistiques</div>
              </div>
            </button>
            <button onClick={() => handleExport('csv')}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--orion-line)', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <FileText size={15} style={{ color:'var(--orion-accent)', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, color:'var(--orion-text)', fontWeight:500 }}>CSV (.csv)</div>
                <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>Données brutes</div>
              </div>
            </button>
            <div style={{ borderTop:'1px solid var(--orion-line)', padding:'8px 16px 4px' }}>
              <span className="o-eyebrow">Logiciels pro</span>
            </div>
            <button onClick={() => handleExport('sportscode')}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--orion-line)', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Code size={15} style={{ color:'var(--orion-accent)', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, color:'var(--orion-text)', fontWeight:500 }}>Hudl SportsCode</div>
                <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>XML compatible Hudl / Nacsport</div>
              </div>
            </button>
            <button onClick={() => handleExport('dartfish')}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid var(--orion-line)', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Monitor size={15} style={{ color:'var(--orion-green)', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, color:'var(--orion-text)', fontWeight:500 }}>Dartfish</div>
                <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>CSV compatible Dartfish</div>
              </div>
            </button>
            <button onClick={() => handleExport('longomatch')}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--orion-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Film size={15} style={{ color:'var(--orion-amber)', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, color:'var(--orion-text)', fontWeight:500 }}>LongoMatch</div>
                <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>CSV compatible LongoMatch</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
