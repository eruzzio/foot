import { useState, useEffect, useCallback, useRef } from 'react';
import { EventType, PanelButtonWithEventType, Panel } from '../types/database';
import { Tag, X, ChevronRight, MapPin } from 'lucide-react';
import { getFootballFieldSVG } from '../utils/footballField';

interface ActionButtonsProps {
  panelButtons: PanelButtonWithEventType[];
  onActionClick: (
    eventType: EventType | null,
    outcome?: 'success' | 'failure',
    buttonType?: 'event' | 'keyword',
    keywordLabel?: string,
    parentButtonId?: string,
    buttonLabel?: string
  ) => void;
  selectedTeam: 'A' | 'B';
  useFreeLayout: boolean;
  allPanels: Panel[];
  currentPanelId: string | null;
  onPanelChange: (panelId: string) => void;
  lockedPanelId?: string | null;
  lastEventId?: string | null;
  lastEventKeywords?: string[];
  lastEventButtonId?: string | null;
}

export default function ActionButtons({
  panelButtons,
  onActionClick,
  selectedTeam,
  useFreeLayout: useFreeLayoutProp,
  allPanels,
  currentPanelId,
  onPanelChange,
  lockedPanelId,
  lastEventId,
  lastEventKeywords = [],
  lastEventButtonId,
}: ActionButtonsProps) {
  const [activePage, setActivePage] = useState(1);
  const [flashingButton, setFlashingButton] = useState<string | null>(null);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const subPanelRef = useRef<HTMLDivElement>(null);

  const rootButtons = panelButtons.filter((b) => !b.parent_button_id && (!b.team_association || b.team_association === selectedTeam));
  const pages = Array.from(new Set(rootButtons.map((b) => b.tab_page ?? 1))).sort((a, b) => a - b);
  const maxPage = pages.length > 0 ? Math.max(...pages) : 1;
  const buttonsOnPage = rootButtons.filter((b) => (b.tab_page ?? 1) === activePage);

  const getSubButtons = useCallback(
    (parentId: string) =>
      panelButtons
        .filter((b) => b.parent_button_id === parentId && (!b.team_association || b.team_association === selectedTeam))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [panelButtons, selectedTeam]
  );

  const activeSubButtons = activeParentId ? getSubButtons(activeParentId) : [];
  const activeParentBtn = activeParentId ? panelButtons.find((b) => b.id === activeParentId) : null;

  const currentPanel = allPanels.find((p) => p.id === currentPanelId);
  const useFreeLayout = useFreeLayoutProp || (currentPanel?.use_free_layout ?? false);

  const flash = useCallback((id: string) => {
    setFlashingButton(id);
    setTimeout(() => setFlashingButton(null), 180);
  }, []);

  const handleEventButtonClick = useCallback(
    (btn: PanelButtonWithEventType) => {
      flash(btn.id);
      const subs = panelButtons.filter((b) => b.parent_button_id === btn.id && (!b.team_association || b.team_association === selectedTeam));
      setActiveParentId(subs.length > 0 ? btn.id : null);
      onActionClick(btn.event_type ?? null, undefined, 'event', btn.label, btn.id, btn.label);
    },
    [onActionClick, panelButtons, flash, selectedTeam]
  );

  const handleSubButtonClick = useCallback(
    (btn: PanelButtonWithEventType) => {
      flash(btn.id);
      if (btn.button_type === 'keyword') {
        onActionClick(
          btn.event_type ?? null,
          undefined,
          'keyword',
          btn.label,
          btn.parent_button_id ?? undefined,
          btn.label
        );
      } else if (btn.event_type) {
        onActionClick(btn.event_type, undefined, 'event', btn.label, btn.parent_button_id ?? undefined, btn.label);
      }
      setActiveParentId(null);
    },
    [onActionClick, flash]
  );

  useEffect(() => {
    if (lastEventButtonId && lastEventButtonId !== activeParentId) {
      const subs = panelButtons.filter((b) => b.parent_button_id === lastEventButtonId);
      if (subs.length > 0) setActiveParentId(lastEventButtonId);
    }
  }, [lastEventId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setActiveParentId(null);
        return;
      }

      const searchPool =
        activeSubButtons.length > 0 ? [...activeSubButtons, ...buttonsOnPage] : buttonsOnPage;

      const btn = searchPool.find((b) => b.shortcut_key?.toLowerCase() === e.key.toLowerCase());
      if (!btn) return;

      if (btn.parent_button_id) {
        handleSubButtonClick(btn);
      } else {
        handleEventButtonClick(btn);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [buttonsOnPage, activeSubButtons, handleEventButtonClick, handleSubButtonClick]);

  const CANVAS_W = 1000;
  const CANVAS_H = 600;

  const getButtonPositionPct = (btn: PanelButtonWithEventType) => {
    if (btn.layout_x !== null && btn.layout_y !== null) {
      const x = btn.layout_x > 100 ? (btn.layout_x / CANVAS_W) * 100 : btn.layout_x;
      const y = btn.layout_y > 100 ? (btn.layout_y / CANVAS_H) * 100 : btn.layout_y;
      return { x, y };
    }
    const col = btn.position % 5;
    const row = Math.floor(btn.position / 5);
    return {
      x: col * (100 / CANVAS_W * 140) + 100 / CANVAS_W * 10,
      y: row * (100 / CANVAS_H * 80) + 100 / CANVAS_H * 10,
    };
  };

  const getButtonSizePct = (btn: PanelButtonWithEventType) => {
    if (btn.width !== null && btn.width !== undefined && btn.width > 0 && btn.width <= 100) {
      return { width: btn.width, height: btn.height ?? (100 / CANVAS_H * 60) };
    }
    if (btn.width !== null && btn.width !== undefined && btn.width > 100) {
      return { width: (btn.width / CANVAS_W) * 100, height: ((btn.height ?? 60) / CANVAS_H) * 100 };
    }
    return { width: (120 / CANVAS_W) * 100, height: (60 / CANVAS_H) * 100 };
  };

  const groups = Array.from(new Set(buttonsOnPage.map((b) => b.group_name ?? '')));
  const hasGroups = groups.some((g) => g !== '');

  const renderPrimaryButton = (btn: PanelButtonWithEventType) => {
    const isFlashing = flashingButton === btn.id;
    const hasSubs = panelButtons.some((b) => b.parent_button_id === btn.id);
    const isActive = activeParentId === btn.id;
    const baseColor = btn.color || '#dc2626';
    const isZone = btn.is_zone ?? false;

    return (
      <button
        key={btn.id}
        onClick={() => handleEventButtonClick(btn)}
        title={btn.shortcut_key ? `Raccourci: ${btn.shortcut_key.toUpperCase()}` : undefined}
        className={`
          relative flex flex-col items-center justify-center gap-0.5 rounded-xl
          font-semibold text-white transition-all select-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-white/40
          hover:brightness-110 active:scale-95
          ${isFlashing ? 'scale-90 brightness-150' : ''}
          ${isActive ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-gray-900' : ''}
        `}
        style={{
          backgroundColor: baseColor,
          minHeight: '72px',
          padding: '10px 12px',
          boxShadow: isActive
            ? `0 0 20px ${baseColor}88, 0 4px 12px ${baseColor}66`
            : `0 2px 10px ${baseColor}44`,
        }}
      >
        <span className="text-sm font-bold leading-tight text-center px-1 break-words w-full">
          {btn.label}
        </span>
        {hasSubs && (
          <span className="flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-wider opacity-70 mt-0.5">
            <ChevronRight size={8} />
            sous-actions
          </span>
        )}
        {isZone && (
          <span className="flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-wider opacity-70 mt-0.5">
            <MapPin size={8} />
            zone
          </span>
        )}
        {btn.shortcut_key && (
          <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold opacity-50">
            {btn.shortcut_key.toUpperCase()}
          </span>
        )}
      </button>
    );
  };

  const renderSubButton = (btn: PanelButtonWithEventType) => {
    const isFlashing = flashingButton === btn.id;
    const isKeyword = btn.button_type === 'keyword';
    const isActive = isKeyword && lastEventKeywords.includes(btn.label);
    const hasLastEvent = !!lastEventId;
    const disabled = isKeyword && !hasLastEvent;
    const baseColor = btn.color || (isKeyword ? '#2563eb' : '#16a34a');

    return (
      <button
        key={btn.id}
        onClick={() => handleSubButtonClick(btn)}
        disabled={disabled}
        className={`
          relative flex items-center justify-center gap-1.5 rounded-lg
          font-semibold text-white transition-all select-none text-sm
          focus:outline-none focus:ring-2 focus:ring-white/40
          disabled:opacity-30 disabled:cursor-not-allowed
          ${isFlashing ? 'scale-90 brightness-150' : 'hover:brightness-110 active:scale-95'}
          ${isActive ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-gray-900' : ''}
        `}
        style={{
          backgroundColor: isActive ? baseColor : isKeyword ? `${baseColor}cc` : baseColor,
          minHeight: '52px',
          padding: '8px 14px',
          boxShadow: isActive ? `0 0 14px ${baseColor}88` : `0 2px 8px ${baseColor}44`,
        }}
      >
        {isKeyword && <Tag size={10} className="opacity-70 flex-shrink-0" />}
        <span className="leading-tight text-center">{btn.label}</span>
        {isActive && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white shadow" />
        )}
        {btn.shortcut_key && (
          <span className="absolute top-0.5 right-1.5 text-[9px] font-mono font-bold opacity-50">
            {btn.shortcut_key.toUpperCase()}
          </span>
        )}
      </button>
    );
  };

  const renderGridLayout = () => {
    if (hasGroups) {
      return (
        <div className="space-y-4">
          {groups.map((group) => {
            const groupBtns = buttonsOnPage.filter((b) => (b.group_name ?? '') === group);
            return (
              <div key={group}>
                {group && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{group}</span>
                    <div className="flex-1 h-px bg-gray-700/50" />
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {groupBtns.map(renderPrimaryButton)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {buttonsOnPage.map(renderPrimaryButton)}
      </div>
    );
  };

  const renderFreeLayout = () => (
    <div
      className="relative rounded-lg border border-gray-700"
      style={{
        paddingBottom: '60%',
        backgroundImage: getFootballFieldSVG(),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0">
        {buttonsOnPage.map((btn) => {
          const pos = getButtonPositionPct(btn);
          const size = getButtonSizePct(btn);
          const isFlashing = flashingButton === btn.id;
          const hasSubs = panelButtons.some((b) => b.parent_button_id === btn.id);
          const isActive = activeParentId === btn.id;
          const baseColor = btn.color || '#dc2626';

          return (
            <button
              key={btn.id}
              onClick={() => handleEventButtonClick(btn)}
              className={`
                absolute flex flex-col items-center justify-center gap-1 rounded-xl
                font-semibold text-white transition-all select-none cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-white/40
                hover:brightness-110 active:scale-95
                ${isFlashing ? 'scale-90 brightness-150' : ''}
                ${isActive ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-gray-900' : ''}
              `}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${size.width}%`,
                height: `${size.height}%`,
                backgroundColor: baseColor,
                boxShadow: isActive ? `0 0 20px ${baseColor}88` : `0 2px 8px ${baseColor}44`,
                zIndex: 10,
              }}
            >
              <span className="text-sm font-bold leading-tight text-center px-1 break-words w-full pointer-events-none">
                {btn.label}
              </span>
              {hasSubs && (
                <span className="flex items-center gap-0.5 text-[9px] opacity-60 pointer-events-none">
                  <ChevronRight size={8} />
                  sous-actions
                </span>
              )}
              {btn.shortcut_key && (
                <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold opacity-50 pointer-events-none">
                  {btn.shortcut_key.toUpperCase()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-dark-secondary border border-gray-800 rounded-xl shadow-2xl text-white">
      {!lockedPanelId && allPanels.length > 1 && (
        <div className="flex items-center gap-1 px-3 pt-3 pb-0 overflow-x-auto">
          {allPanels.map((panel) => (
            <button
              key={panel.id}
              onClick={() => {
                onPanelChange(panel.id);
                setActivePage(1);
                setActiveParentId(null);
              }}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                panel.id === currentPanelId
                  ? 'bg-dark-tertiary text-white border-orange-primary'
                  : 'text-gray-500 hover:text-gray-300 border-transparent hover:bg-dark-tertiary/50'
              }`}
            >
              {panel.name}
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
              <span className="text-xs text-gray-400">Événement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag size={10} className="text-blue-400" />
              <span className="text-xs text-gray-400">Qualificatif</span>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Équipe{' '}
              <span className={selectedTeam === 'A' ? 'text-green-400' : 'text-orange-400'}>
                {selectedTeam}
              </span>
            </div>
          </div>

          {maxPage > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: maxPage }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => { setActivePage(page); setActiveParentId(null); }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                    activePage === page
                      ? 'bg-orange-primary text-white'
                      : 'bg-dark-tertiary text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>

        {rootButtons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm mb-1">Aucun bouton configuré</p>
            <p className="text-xs text-gray-600">Configurez vos boutons dans "Mes Panneaux"</p>
          </div>
        ) : useFreeLayout ? (
          renderFreeLayout()
        ) : buttonsOnPage.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Aucun bouton sur cette page</p>
          </div>
        ) : (
          renderGridLayout()
        )}

        {activeSubButtons.length > 0 && (
          <div
            ref={subPanelRef}
            className="mt-3 rounded-xl border border-gray-600/60 overflow-hidden"
            style={{ backgroundColor: '#0f1520' }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/60">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: activeParentBtn?.color || '#dc2626' }}
                />
                <span className="text-xs font-semibold text-gray-300">
                  {activeParentBtn?.label}
                </span>
                <ChevronRight size={12} className="text-gray-500" />
                <span className="text-xs text-gray-500">Précisez l'action</span>
              </div>
              <button
                onClick={() => setActiveParentId(null)}
                className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-300"
              >
                <X size={12} />
              </button>
            </div>
            <div className="p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {activeSubButtons.map(renderSubButton)}
            </div>
          </div>
        )}

        {maxPage > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
            <button
              onClick={() => { setActivePage((p) => Math.max(1, p - 1)); setActiveParentId(null); }}
              disabled={activePage === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-dark-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Page précédente
            </button>
            <span className="text-xs text-gray-500">{activePage} / {maxPage}</span>
            <button
              onClick={() => { setActivePage((p) => Math.min(maxPage, p + 1)); setActiveParentId(null); }}
              disabled={activePage === maxPage}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-dark-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Page suivante
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
