import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, LayoutTemplate } from 'lucide-react';
import { MatchEventWithDetails } from '../types/database';
import { exportToCSV, exportToExcel } from '../utils/exportData';
import { exportToPdf } from '../utils/exportPdf';

interface ExportButtonProps {
  events: MatchEventWithDetails[];
  teamAName: string;
  teamBName: string;
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

export default function ExportButton({ events, teamAName, teamBName, matchDate, scoreA, scoreB, duration, location, competition, teamALogoUrl, teamBLogoUrl, disabled }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = {
      events,
      matchInfo: {
        teamA: teamAName,
        teamB: teamBName,
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
    } else {
      exportToPdf(exportData);
    }

    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || events.length === 0}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          disabled || events.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        <Download size={18} />
        Exporter
      </button>

      {isOpen && !disabled && events.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20 text-gray-900">
            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
            >
              <LayoutTemplate size={18} className="text-red-500" />
              <div>
                <div className="font-medium text-gray-800">Fiche Stats PDF</div>
                <div className="text-xs text-gray-500">Rapport visuel staff</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
            >
              <FileSpreadsheet size={18} className="text-green-600" />
              <div>
                <div className="font-medium text-gray-800">Excel (.xlsx)</div>
                <div className="text-xs text-gray-500">Avec statistiques</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <FileText size={18} className="text-blue-600" />
              <div>
                <div className="font-medium text-gray-800">CSV (.csv)</div>
                <div className="text-xs text-gray-500">Données brutes</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
