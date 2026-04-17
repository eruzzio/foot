import { useState, useRef, useEffect, useCallback } from 'react';
import { PanelButtonWithEventType } from '../types/database';
import { supabase } from '../lib/supabase';
import { Move, RotateCcw, Copy, X } from 'lucide-react';
import { getFootballFieldSVG } from '../utils/footballField';

const CANVAS_REF_WIDTH = 1000;
const CANVAS_REF_HEIGHT = 600;
const GRID_CELLS = 20;
const MIN_WIDTH_PCT = 6;
const MIN_HEIGHT_PCT = 6;

type ResizeDirection = 'se' | 'sw' | 'ne' | 'nw';

interface ResizeState {
  buttonId: string;
  direction: ResizeDirection;
  startX: number;
  startY: number;
  startLeftPct: number;
  startTopPct: number;
  startWidthPct: number;
  startHeightPct: number;
}

interface FreeLayoutEditorProps {
  panelId: string;
  buttons: PanelButtonWithEventType[];
  onUpdate: () => void;
}

function snapToGrid(valuePct: number, totalCells: number): number {
  const step = 100 / totalCells;
  return Math.round(valuePct / step) * step;
}

export default function FreeLayoutEditor({ panelId, buttons, onUpdate }: FreeLayoutEditorProps) {
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [draggedButton, setDraggedButton] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [dragOffset, setDragOffset] = useState({ xPct: 0, yPct: 0 });
  const [snapEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pxToPct = useCallback((px: number, dimension: 'w' | 'h') => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return (px / (dimension === 'w' ? rect.width : rect.height)) * 100;
  }, []);

  const updateButtonLayout = useCallback(async (
    buttonId: string,
    updates: { layout_x?: number; layout_y?: number; width?: number; height?: number }
  ) => {
    await supabase.from('panel_buttons').update(updates).eq('id', buttonId);
    onUpdate();
  }, [onUpdate]);

  const resetAllPositions = async () => {
    if (!confirm('Réinitialiser toutes les positions des boutons à la grille par défaut ?')) return;
    for (const button of buttons) {
      await supabase
        .from('panel_buttons')
        .update({ layout_x: null, layout_y: null, width: null, height: null })
        .eq('id', button.id);
    }
    onUpdate();
  };

  const deleteButton = async (buttonId: string) => {
    if (!confirm('Supprimer ce bouton ?')) return;
    await supabase.from('panel_buttons').delete().eq('id', buttonId);
    setSelectedButton(null);
    onUpdate();
  };

  const duplicateButton = async (button: PanelButtonWithEventType) => {
    const pos = getButtonPositionPct(button);
    const size = getButtonSizePct(button);
    const step = 100 / GRID_CELLS;
    await supabase.from('panel_buttons').insert({
      panel_id: panelId,
      event_type_id: button.event_type_id,
      label: button.label,
      position: buttons.length,
      color: button.color,
      button_type: button.button_type,
      tab_page: button.tab_page,
      shortcut_key: null,
      group_name: button.group_name,
      layout_x: Math.min(pos.x + step, 100 - size.width),
      layout_y: Math.min(pos.y + step, 100 - size.height),
      width: size.width,
      height: size.height,
    });
    onUpdate();
  };

  const getButtonPositionPct = (button: PanelButtonWithEventType) => {
    if (button.layout_x !== null && button.layout_y !== null) {
      const x = button.layout_x > 100 ? (button.layout_x / CANVAS_REF_WIDTH) * 100 : button.layout_x;
      const y = button.layout_y > 100 ? (button.layout_y / CANVAS_REF_HEIGHT) * 100 : button.layout_y;
      return { x, y };
    }
    const col = button.position % 5;
    const row = Math.floor(button.position / 5);
    return {
      x: col * (100 / CANVAS_REF_WIDTH * 140) + 100 / CANVAS_REF_WIDTH * 10,
      y: row * (100 / CANVAS_REF_HEIGHT * 80) + 100 / CANVAS_REF_HEIGHT * 10,
    };
  };

  const getButtonSizePct = (button: PanelButtonWithEventType) => {
    if (button.width !== null && button.width !== undefined && button.width > 0 && button.width <= 100) {
      return { width: button.width, height: button.height ?? (100 / CANVAS_REF_HEIGHT * 60) };
    }
    if (button.width !== null && button.width !== undefined && button.width > 100) {
      return {
        width: (button.width / CANVAS_REF_WIDTH) * 100,
        height: ((button.height ?? 60) / CANVAS_REF_HEIGHT) * 100,
      };
    }
    return {
      width: (120 / CANVAS_REF_WIDTH) * 100,
      height: (60 / CANVAS_REF_HEIGHT) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, buttonId: string) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setDraggedButton(buttonId);
    setSelectedButton(buttonId);
    setDragOffset({
      xPct: ((e.clientX - rect.left) / containerRect.width) * 100,
      yPct: ((e.clientY - rect.top) / containerRect.height) * 100,
    });
  };

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    buttonId: string,
    button: PanelButtonWithEventType,
    direction: ResizeDirection
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const pos = getButtonPositionPct(button);
    const size = getButtonSizePct(button);

    setResizeState({
      buttonId,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startLeftPct: pos.x,
      startTopPct: pos.y,
      startWidthPct: size.width,
      startHeightPct: size.height,
    });
    setSelectedButton(buttonId);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      if (draggedButton) {
        const button = buttons.find((b) => b.id === draggedButton);
        if (!button) return;

        const size = getButtonSizePct(button);
        let xPct = ((e.clientX - containerRect.left) / containerRect.width) * 100 - dragOffset.xPct;
        let yPct = ((e.clientY - containerRect.top) / containerRect.height) * 100 - dragOffset.yPct;

        if (snapEnabled) {
          xPct = snapToGrid(xPct, GRID_CELLS);
          yPct = snapToGrid(yPct, GRID_CELLS);
        }

        xPct = Math.max(0, Math.min(xPct, 100 - size.width));
        yPct = Math.max(0, Math.min(yPct, 100 - size.height));

        const element = document.getElementById(`freelayout-btn-${draggedButton}`);
        if (element) {
          element.style.left = `${xPct}%`;
          element.style.top = `${yPct}%`;
        }
      }

      if (resizeState) {
        const { buttonId, direction, startX, startY, startLeftPct, startTopPct, startWidthPct, startHeightPct } = resizeState;
        const deltaXPct = ((e.clientX - startX) / containerRect.width) * 100;
        const deltaYPct = ((e.clientY - startY) / containerRect.height) * 100;

        let newLeftPct = startLeftPct;
        let newTopPct = startTopPct;
        let newWidthPct = startWidthPct;
        let newHeightPct = startHeightPct;

        if (direction === 'se') {
          newWidthPct = Math.max(MIN_WIDTH_PCT, startWidthPct + deltaXPct);
          newHeightPct = Math.max(MIN_HEIGHT_PCT, startHeightPct + deltaYPct);
        } else if (direction === 'sw') {
          const rawWidth = Math.max(MIN_WIDTH_PCT, startWidthPct - deltaXPct);
          newLeftPct = startLeftPct + startWidthPct - rawWidth;
          newWidthPct = rawWidth;
          newHeightPct = Math.max(MIN_HEIGHT_PCT, startHeightPct + deltaYPct);
        } else if (direction === 'ne') {
          newWidthPct = Math.max(MIN_WIDTH_PCT, startWidthPct + deltaXPct);
          const rawHeight = Math.max(MIN_HEIGHT_PCT, startHeightPct - deltaYPct);
          newTopPct = startTopPct + startHeightPct - rawHeight;
          newHeightPct = rawHeight;
        } else if (direction === 'nw') {
          const rawWidth = Math.max(MIN_WIDTH_PCT, startWidthPct - deltaXPct);
          newLeftPct = startLeftPct + startWidthPct - rawWidth;
          newWidthPct = rawWidth;
          const rawHeight = Math.max(MIN_HEIGHT_PCT, startHeightPct - deltaYPct);
          newTopPct = startTopPct + startHeightPct - rawHeight;
          newHeightPct = rawHeight;
        }

        if (snapEnabled) {
          newWidthPct = snapToGrid(newWidthPct, GRID_CELLS);
          newHeightPct = snapToGrid(newHeightPct, GRID_CELLS);
          newLeftPct = snapToGrid(newLeftPct, GRID_CELLS);
          newTopPct = snapToGrid(newTopPct, GRID_CELLS);
        }

        newLeftPct = Math.max(0, Math.min(newLeftPct, 100 - newWidthPct));
        newTopPct = Math.max(0, Math.min(newTopPct, 100 - newHeightPct));

        const element = document.getElementById(`freelayout-btn-${buttonId}`);
        if (element) {
          element.style.left = `${newLeftPct}%`;
          element.style.top = `${newTopPct}%`;
          element.style.width = `${newWidthPct}%`;
          element.style.height = `${newHeightPct}%`;
        }
      }
    };

    const handleMouseUp = () => {
      if (draggedButton) {
        const element = document.getElementById(`freelayout-btn-${draggedButton}`);
        if (element) {
          const xPct = parseFloat(element.style.left);
          const yPct = parseFloat(element.style.top);
          updateButtonLayout(draggedButton, { layout_x: xPct, layout_y: yPct });
        }
        setDraggedButton(null);
      }

      if (resizeState) {
        const element = document.getElementById(`freelayout-btn-${resizeState.buttonId}`);
        if (element) {
          const widthPct = parseFloat(element.style.width);
          const heightPct = parseFloat(element.style.height);
          const xPct = parseFloat(element.style.left);
          const yPct = parseFloat(element.style.top);
          updateButtonLayout(resizeState.buttonId, { width: widthPct, height: heightPct, layout_x: xPct, layout_y: yPct });
        }
        setResizeState(null);
      }
    };

    if (draggedButton || resizeState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedButton, resizeState, dragOffset, buttons, snapEnabled, updateButtonLayout, pxToPct]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedButton(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isInteracting = draggedButton !== null || resizeState !== null;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-950/60 border-2 border-emerald-700/80 rounded-lg p-4 shadow-lg shadow-emerald-900/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-emerald-900/40 rounded-lg flex-shrink-0">
              <Move className="text-emerald-400 mt-0" size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-emerald-200">Mode Édition Libre</h3>
                <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 text-xs rounded-full font-medium border border-emerald-700/50">
                  Actif
                </span>
              </div>
              <p className="text-sm text-emerald-300 mb-2">
                Glissez les boutons pour les déplacer. Utilisez les poignées aux 4 coins pour redimensionner.
              </p>
              <p className="text-xs text-emerald-400/80 bg-emerald-900/30 px-2.5 py-1.5 rounded border border-emerald-800/40">
                Les positions seront synchronisées avec votre codage live.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={resetAllPositions}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 rounded-lg hover:bg-emerald-900/60 transition-colors text-xs font-medium"
            >
              <RotateCcw size={13} />
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-lg border-2 border-emerald-700/40 overflow-hidden shadow-inner shadow-emerald-900/20"
        style={{
          paddingBottom: '60%',
          backgroundImage: `url('${getFootballFieldSVG()}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          cursor: isInteracting ? 'grabbing' : 'default',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedButton(null);
        }}
      >
        <div className="absolute inset-0">
          {buttons.map((button) => {
            const pos = getButtonPositionPct(button);
            const size = getButtonSizePct(button);
            const isSelected = selectedButton === button.id;
            const isDragging = draggedButton === button.id;
            const isResizing = resizeState?.buttonId === button.id;

            return (
              <div
                key={button.id}
                id={`freelayout-btn-${button.id}`}
                className={`absolute rounded-lg select-none ${
                  isDragging || isResizing ? 'opacity-75 cursor-grabbing z-20' : 'cursor-grab z-10'
                } ${isSelected && !isDragging && !isResizing ? 'z-10' : ''}`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  width: `${size.width}%`,
                  height: `${size.height}%`,
                  backgroundColor: button.color,
                  color: 'white',
                  boxShadow: isSelected
                    ? '0 0 0 2px white, 0 0 0 4px rgba(59,130,246,0.8), 0 8px 24px rgba(0,0,0,0.5)'
                    : '0 2px 8px rgba(0,0,0,0.4)',
                }}
                onMouseDown={(e) => handleMouseDown(e, button.id)}
              >
                <div className="h-full w-full flex items-center justify-center p-2 pointer-events-none">
                  <span className="font-semibold text-center text-sm break-words leading-tight">
                    {button.label}
                  </span>
                </div>

                {isSelected && (
                  <>
                    {(['nw', 'ne', 'sw', 'se'] as ResizeDirection[]).map((dir) => (
                      <div
                        key={dir}
                        className={`resize-handle absolute w-4 h-4 bg-white rounded-full border-2 border-blue-500 z-30 hover:scale-125 transition-transform ${
                          dir === 'nw' ? '-top-2 -left-2 cursor-nw-resize' :
                          dir === 'ne' ? '-top-2 -right-2 cursor-ne-resize' :
                          dir === 'sw' ? '-bottom-2 -left-2 cursor-sw-resize' :
                          '-bottom-2 -right-2 cursor-se-resize'
                        }`}
                        onMouseDown={(e) => handleResizeMouseDown(e, button.id, button, dir)}
                      />
                    ))}

                    <div className="resize-handle absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30">
                      <button
                        className="flex items-center gap-1 px-2 py-0.5 bg-dark-secondary text-gray-300 text-xs rounded border border-gray-600 hover:bg-gray-700 transition-colors whitespace-nowrap"
                        onMouseDown={(e) => { e.stopPropagation(); }}
                        onClick={(e) => { e.stopPropagation(); duplicateButton(button); }}
                      >
                        <Copy size={10} />
                        Dupliquer
                      </button>
                      <button
                        className="flex items-center justify-center w-5 h-5 bg-red-600 text-white rounded border border-red-500 hover:bg-red-500 transition-colors"
                        onMouseDown={(e) => { e.stopPropagation(); }}
                        onClick={(e) => { e.stopPropagation(); deleteButton(button.id); }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {buttons.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
              Ajoutez des boutons à votre panneau pour commencer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
