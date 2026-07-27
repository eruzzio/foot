import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Panel, PanelButtonWithEventType, EventType } from '../types/database';
import { Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronDown, GripVertical, LayoutGrid, Move, Tag, MapPin } from 'lucide-react';
import { createProFootballPanel } from '../utils/createProPanel';
import FreeLayoutEditor from './FreeLayoutEditor';

interface PanelsManagerProps {
  onBack: () => void;
}

type View = 'list' | 'panel' | 'create';
type PanelTab = 'list' | 'layout';

const PRESET_COLORS = [
  '#dc2626', '#b91c1c', '#ef4444',
  '#2563eb', '#1d4ed8', '#3b82f6',
  '#16a34a', '#15803d', '#22c55e',
  '#d97706', '#b45309', '#f59e0b',
  '#0891b2', '#0e7490', '#06b6d4',
  '#be185d', '#9d174d', '#ec4899',
  '#374151', '#1f2937', '#6b7280',
];

export default function PanelsManager({ onBack }: PanelsManagerProps) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [panelButtons, setPanelButtons] = useState<PanelButtonWithEventType[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [view, setView] = useState<View>('list');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItem = useRef<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const [activeTab, setActiveTab] = useState<PanelTab>('list');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonColor, setButtonColor] = useState('#dc2626');
  const [buttonType, setButtonType] = useState<'event' | 'keyword'>('event');
  const [buttonTabPage, setButtonTabPage] = useState(1);
  const [buttonShortcut, setButtonShortcut] = useState('');
  const [buttonGroup, setButtonGroup] = useState('');
  const [parentButtonId, setParentButtonId] = useState<string | null>(null);

  const [expandedButtons, setExpandedButtons] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buttonTeamAssociation, setButtonTeamAssociation] = useState<'A' | 'B' | null>(null);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  const [isZone, setIsZone] = useState(false);
  const [locationMode, setLocationMode] = useState<'none' | 'field' | 'field_and_goal' | 'zones'>('none');

  useEffect(() => {
    loadData();
  }, []);

  const loadPanels = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('panels')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setPanels(data);
  };

  const loadEventTypes = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('event_types')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userData.user?.id}`)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (data) setEventTypes(data);
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPanels(), loadEventTypes()]);
    setLoading(false);
  };

  const loadPanelButtons = async (panelId: string) => {
    const { data } = await supabase
      .from('panel_buttons')
      .select('*, event_type:event_types(*)')
      .eq('panel_id', panelId)
      .order('tab_page', { ascending: true })
      .order('display_order', { ascending: true })
      .order('position', { ascending: true });

    if (data) setPanelButtons(data as any);
  };

  const openPanel = async (panel: Panel) => {
    setSelectedPanel(panel);
    await loadPanelButtons(panel.id);
    setActiveTab('list');
    setShowCreateForm(false);
    setView('panel');
  };

  const handleReorderButtons = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const rootBtns = panelButtons.filter(b => !b.parent_button_id);
    const dragIdx = rootBtns.findIndex(b => b.id === draggedId);
    const targetIdx = rootBtns.findIndex(b => b.id === targetId);
    if (dragIdx === -1 || targetIdx === -1) return;

    const reordered = [...rootBtns];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updatedIds = reordered.map(b => b.id);
    setPanelButtons(prev => {
      const subs = prev.filter(b => b.parent_button_id);
      const newRoots = reordered.map((b, i) => ({ ...b, display_order: i }));
      return [...newRoots, ...subs];
    });

    await Promise.all(
      reordered.map((btn, i) =>
        supabase.from('panel_buttons').update({ display_order: i }).eq('id', btn.id)
      )
    );
  };

  const startCreate = () => {
    setFormName('');
    setFormDescription('');
    setError('');
    setSelectedPanel(null);
    setView('create');
  };

  const handleCreateProPanel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setSaving(true);
      const panelId = await createProFootballPanel(user.id);
      if (panelId) {
        await loadPanels();
      }
      setSaving(false);
    } catch (err) {
      console.error('Error creating pro panel:', err);
      setSaving(false);
    }
  };

  const startEdit = (panel: Panel) => {
    setSelectedPanel(panel);
    setFormName(panel.name);
    setFormDescription(panel.description);
    setError('');
    setView('create');
  };

  const savePanel = async () => {
    if (!formName.trim()) {
      setError('Le nom du panneau est requis');
      return;
    }
    setSaving(true);
    setError('');

    if (selectedPanel?.id) {
      const { error } = await supabase
        .from('panels')
        .update({ name: formName.trim(), description: formDescription.trim() })
        .eq('id', selectedPanel.id);

      if (error) {
        setError('Erreur lors de la sauvegarde');
      } else {
        await loadPanels();
        const updated = { ...selectedPanel, name: formName.trim(), description: formDescription.trim() };
        setSelectedPanel(updated);
        await loadPanelButtons(selectedPanel.id);
        setView('panel');
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('panels')
        .insert({
          user_id: userData.user?.id,
          name: formName.trim(),
          description: formDescription.trim(),
          is_default: false,
          use_free_layout: false,
        })
        .select()
        .single();

      if (error || !data) {
        setError('Erreur lors de la création du panneau');
      } else {
        await loadPanels();
        setSelectedPanel(data);
        setPanelButtons([]);
        setActiveTab('list');
        setView('panel');
      }
    }
    setSaving(false);
  };

  const deletePanel = async (panelId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce panneau ?')) return;

    const { error } = await supabase.from('panels').delete().eq('id', panelId);
    if (!error) {
      setSelectedPanel(null);
      setPanelButtons([]);
      await loadPanels();
      setView('list');
    } else {
      setError('Erreur lors de la suppression du panneau');
    }
  };

  const resetButtonForm = () => {
    setSelectedEventTypeId('');
    setButtonLabel('');
    setButtonColor('#dc2626');
    setButtonType('event');
    setButtonTabPage(1);
    setButtonShortcut('');
    setButtonGroup('');
    setParentButtonId(null);
    setButtonTeamAssociation(null);
    setEditingButtonId(null);
    setIsZone(false);
    setLocationMode('none');
  };

  const startAddSubButton = (parentBtn: PanelButtonWithEventType) => {
    resetButtonForm();
    setParentButtonId(parentBtn.id);
    setButtonType('keyword');
    setButtonColor('#2563eb');
    setButtonTabPage(parentBtn.tab_page ?? 1);
    setShowCreateForm(true);
    setActiveTab('list');
  };

  const startEditButton = (button: PanelButtonWithEventType) => {
    setEditingButtonId(button.id);
    setSelectedEventTypeId(button.event_type_id || '');
    setButtonLabel(button.label);
    setButtonColor(button.color);
    setButtonType(button.button_type);
    setButtonTabPage(button.tab_page ?? 1);
    setButtonShortcut(button.shortcut_key || '');
    setButtonGroup(button.group_name || '');
    setParentButtonId(button.parent_button_id);
    setButtonTeamAssociation(button.team_association);
    setIsZone(button.is_zone ?? false);
    setLocationMode(button.location_mode ?? 'none');
    setShowCreateForm(true);
    setActiveTab('list');
  };

  const addButton = async () => {
    if (!buttonLabel.trim() || !selectedPanel) return;
    setSaving(true);

    const rootButtonsOnPage = panelButtons.filter(
      (b) => !b.parent_button_id && (b.tab_page ?? 1) === buttonTabPage
    );

    if (editingButtonId) {
      const { error } = await supabase.from('panel_buttons').update({
        event_type_id: selectedEventTypeId || null,
        label: buttonLabel.trim(),
        color: buttonColor,
        shortcut_key: buttonShortcut.trim() || null,
        group_name: parentButtonId ? null : (buttonGroup.trim() || null),
        team_association: buttonTeamAssociation,
        is_zone: isZone,
        location_mode: locationMode,
      }).eq('id', editingButtonId);

      if (!error) {
        await loadPanelButtons(selectedPanel.id);
        resetButtonForm();
        setShowCreateForm(false);
      }
    } else {
      const { error } = await supabase.from('panel_buttons').insert({
        panel_id: selectedPanel.id,
        event_type_id: selectedEventTypeId || null,
        label: buttonLabel.trim(),
        position: parentButtonId
          ? panelButtons.filter((b) => b.parent_button_id === parentButtonId).length
          : rootButtonsOnPage.length,
        color: buttonColor,
        button_type: buttonType,
        tab_page: buttonTabPage,
        shortcut_key: buttonShortcut.trim() || null,
        group_name: parentButtonId ? null : (buttonGroup.trim() || null),
        parent_button_id: parentButtonId,
        display_order: parentButtonId
          ? panelButtons.filter((b) => b.parent_button_id === parentButtonId).length
          : rootButtonsOnPage.length,
        team_association: buttonTeamAssociation,
        is_zone: isZone,
        location_mode: locationMode,
      });

      if (!error) {
        await loadPanelButtons(selectedPanel.id);
        if (parentButtonId) {
          setExpandedButtons((prev) => new Set(prev).add(parentButtonId));
        }
        resetButtonForm();
        setShowCreateForm(false);
      }
    }
    setSaving(false);
  };

  const toggleFreeLayout = async (panel: Panel) => {
    const newValue = !panel.use_free_layout;
    await supabase.from('panels').update({ use_free_layout: newValue }).eq('id', panel.id);
    const updated = { ...panel, use_free_layout: newValue };
    setSelectedPanel(updated);
    await loadPanels();
  };

  const deleteButton = async (buttonId: string) => {
    if (!confirm('Supprimer ce bouton et ses sous-boutons ?')) return;
    const { error } = await supabase.from('panel_buttons').delete().eq('id', buttonId);
    if (!error && selectedPanel) {
      await loadPanelButtons(selectedPanel.id);
    }
  };

  const handleEventTypeSelect = (etId: string) => {
    setSelectedEventTypeId(etId);
    const et = eventTypes.find((e) => e.id === etId);
    if (et) {
      setButtonLabel(et.name);
      setButtonColor(et.color);
    }
  };

  const toggleExpanded = (buttonId: string) => {
    setExpandedButtons((prev) => {
      const next = new Set(prev);
      if (next.has(buttonId)) next.delete(buttonId);
      else next.add(buttonId);
      return next;
    });
  };

  const groupedEventTypes = eventTypes.reduce<Record<string, EventType[]>>((acc, et) => {
    if (!acc[et.category]) acc[et.category] = [];
    acc[et.category].push(et);
    return acc;
  }, {});

  const rootButtons = panelButtons.filter((b) => !b.parent_button_id);
  const existingGroups = Array.from(new Set(rootButtons.map((b) => b.group_name).filter(Boolean))) as string[];

  const parentBtnForForm = parentButtonId ? panelButtons.find((b) => b.id === parentButtonId) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-secondary text-white flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  const handleBack = () => {
    if (view === 'list') onBack();
    else if (view === 'panel') setView('list');
    else if (view === 'create') {
      if (selectedPanel) setView('panel');
      else setView('list');
    }
  };

  const renderButtonRow = (button: PanelButtonWithEventType) => {
    const subButtons = panelButtons.filter((b) => b.parent_button_id === button.id);
    const isExpanded = expandedButtons.has(button.id);

    return (
      <div key={button.id}>
        <div
style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8,
            background: dragOverId === button.id ? 'rgba(61,128,224,0.06)' : 'var(--orion-surface)',
            border: `1.5px solid ${dragOverId === button.id ? 'var(--orion-accent)' : 'var(--orion-line)'}`,
            transition:'all .12s', cursor:'grab' }}
          draggable
          onDragStart={() => { dragItem.current = button.id; }}
          onDragOver={(e) => { e.preventDefault(); setDragOverId(button.id); }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (dragItem.current) handleReorderButtons(dragItem.current, button.id);
            dragItem.current = null;
            setDragOverId(null);
          }}
          onDragEnd={() => { dragItem.current = null; setDragOverId(null); }}
        >
          <GripVertical size={15} style={{ color:"var(--orion-text-faint)", flexShrink:0, cursor:"grab" }} />
          <div
            className="w-3.5 h-3.5 rounded flex-shrink-0"
            style={{ backgroundColor: button.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize:13, fontWeight:600, color:"var(--orion-text)" }}>{button.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                button.button_type === 'event'
                  ? 'bg-red-50 text-red-500 border border-red-200'
                  : 'bg-blue-50 text-blue-500 border border-blue-200'
              }`}>
                {button.button_type === 'event' ? 'Événement' : 'Qualificatif'}
              </span>
              {button.team_association && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  button.team_association === 'A'
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-blue-50 text-blue-500 border border-blue-200'
                }`}>
                  Équipe {button.team_association}
                </span>
              )}
              {button.shortcut_key && (
                <span style={{ fontSize:9, fontFamily:"var(--orion-font-mono)", color:"var(--orion-text-mute)", background:"var(--orion-surface-2)", padding:"1px 5px", borderRadius:4, border:"1px solid var(--orion-line)" }}>
                  {button.shortcut_key.toUpperCase()}
                </span>
              )}
              {button.event_type ? (
                <span style={{ fontSize:10, color:"var(--orion-text-faint)" }}>({button.event_type.name})</span>
              ) : (
                <span className="text-[10px] text-amber-500 italic">Non assigné</span>
              )}
              {subButtons.length > 0 && (
                <span style={{ fontSize:10, color:"var(--orion-text-faint)" }}>
                  {subButtons.length} sous-bouton{subButtons.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
            {button.button_type === 'event' && (
              <button
                onClick={() => startAddSubButton(button)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-400 hover:bg-green-900/20 rounded transition-colors"
                title="Ajouter un sous-bouton"
              >
                <Plus size={11} />
                Sous-bouton
              </button>
            )}
            {subButtons.length > 0 && (
              <button
                onClick={() => toggleExpanded(button.id)}
                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-dark-secondary rounded transition-colors"
                title={isExpanded ? 'Réduire' : 'Voir les sous-boutons'}
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            )}
            <button
              onClick={() => startEditButton(button)}
              className="p-1.5 text-blue-500 hover:bg-blue-900/20 rounded transition-colors"
              title="Éditer"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => deleteButton(button.id)}
              className="p-1.5 text-red-500 hover:bg-red-900/20 rounded transition-colors"
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {editingButtonId === button.id && showCreateForm && (
          <div className="border border-orion-accent/40 bg-dark-secondary/80 p-4 mt-1 mb-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-orion-accent">Modifier le bouton</span>
              <button onClick={() => { resetButtonForm(); setShowCreateForm(false); }} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
            </div>
            <div className="max-w-lg space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Étiquette</label>
                <input type="text" value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} style={{ width:"100%", padding:"8px 12px", background:"var(--orion-surface)", border:"1.5px solid var(--orion-line-strong)", borderRadius:6, color:"var(--orion-text)", fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Couleur</label>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 mb-2">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} onClick={() => setButtonColor(c)} className={`w-7 h-7 rounded transition-transform hover:scale-110 ${buttonColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-secondary scale-110' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-orion-line bg-transparent" />
                    <span className="text-xs text-gray-500">Personnalisée</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Aperçu</label>
                  <div className="relative flex flex-col items-center justify-center gap-1 text-white" style={{ backgroundColor: buttonColor, minHeight: '72px', padding: '10px 8px' }}>
                    <span className="text-sm font-bold leading-tight text-center">{buttonLabel || 'Aperçu'}</span>
                    <span className="text-[9px] uppercase opacity-60 tracking-wider">{buttonType === 'event' ? 'ÉVÉNEMENT' : 'QUALIFICATIF'}</span>
                  </div>
                </div>
              </div>
              {!parentButtonId && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Localisation</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['none','zones','field','field_and_goal'] as const).map((mode) => (
                      <button key={mode} onClick={() => { setLocationMode(mode); setIsZone(false); }} className={`p-2 border-2 transition-all text-center ${locationMode === mode ? 'border-orion-accent bg-orion-accent/10' : 'border-orion-line bg-dark-tertiary hover:border-gray-600'}`}>
                        <div className="text-xs font-bold text-white">{mode === 'none' ? 'Normal' : mode === 'zones' ? '3 Zones' : mode === 'field' ? 'Position' : 'Pos+But'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={addButton} disabled={saving || !buttonLabel.trim()} className="flex items-center gap-2 px-5 py-2 bg-orange-primary hover-orange text-white transition-colors text-sm font-medium disabled:opacity-50">
                  <Check size={14} />
                  {saving ? 'Sauvegarde...' : 'Mettre à jour'}
                </button>
                <button onClick={() => { resetButtonForm(); setShowCreateForm(false); }} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", background:"var(--orion-surface-2)", border:"1.5px solid var(--orion-line)", borderRadius:8, fontSize:13, fontWeight:600, color:"var(--orion-text-dim)", cursor:"pointer" }}>
                  <X size={14} />
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {subButtons.length > 0 && isExpanded && (
          <div className="ml-6 mt-1 space-y-1 border-l-2 border-orion-line/50 pl-3">
            {subButtons.map((sub) => (
              <div
                key={sub.id}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:6, background:"var(--orion-surface-2)", border:"1px solid var(--orion-line)" }}
              >
                <div
                  className="w-3 h-3 rounded flex-shrink-0"
                  style={{ backgroundColor: sub.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {sub.button_type === 'keyword' && <Tag size={9} className="text-blue-400 flex-shrink-0" />}
                    <span className="text-xs font-medium text-gray-300">{sub.label}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                      sub.button_type === 'event'
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-blue-900/40 text-blue-400'
                    }`}>
                      {sub.button_type === 'event' ? 'Événement' : 'Qualificatif'}
                    </span>
                    {sub.team_association && (
                      <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                        sub.team_association === 'A'
                          ? 'bg-green-900/40 text-green-400'
                          : 'bg-blue-900/40 text-blue-400'
                      }`}>
                        Équipe {sub.team_association}
                      </span>
                    )}
                    {sub.shortcut_key && (
                      <span style={{ fontSize:9, fontFamily:"var(--orion-font-mono)", color:"var(--orion-text-faint)", background:"var(--orion-surface-3)", padding:"1px 4px", borderRadius:3 }}>
                        {sub.shortcut_key.toUpperCase()}
                      </span>
                    )}
                    {sub.event_type ? (
                      <span className="text-[9px] text-gray-600">({sub.event_type.name})</span>
                    ) : (
                      <span className="text-[9px] text-amber-600 italic">Non assigné</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditButton(sub)}
                    className="p-1 text-blue-500 hover:bg-blue-900/20 rounded transition-colors"
                    title="Éditer"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => deleteButton(sub.id)}
                    className="p-1 text-red-500 hover:bg-red-900/20 rounded transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => startAddSubButton(button)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-green-400 hover:bg-green-900/10  border border-dashed border-orion-line hover:border-green-800 transition-colors w-full"
            >
              <Plus size={11} />
              Ajouter un sous-bouton
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--orion-bg)", color:"var(--orion-text)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={handleBack}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--orion-text-dim)', cursor:'pointer' }}
          >
            ←
            {view === 'list' ? "Retour à l'accueil" : 'Retour'}
          </button>
          {view !== 'list' && selectedPanel && (
            <span style={{ fontSize:13, color:'var(--orion-text-mute)' }}>{selectedPanel.name}</span>
          )}
        </div>

        {view === 'list' && (
          <div>
            {/* Hero sombre */}
            <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'24px 24px 20px', color:'#fff', marginBottom:20, boxShadow:'0 16px 40px -16px rgba(13,17,23,0.4)' }}>
              <div style={{ position:'absolute', top:0, right:0, width:320, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
              <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd', marginBottom:8 }}>Configuration</div>
                  <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#fff' }}>Mes Panneaux</h1>
                  <p style={{ margin:'6px 0 0', fontSize:13, color:'#8aa0bd' }}>Les boutons que tu utilises pendant le codage live.</p>
                </div>
                <button onClick={startCreate} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', background:'var(--orion-accent)', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0, boxShadow:'0 4px 14px rgba(61,128,224,0.4)' }}>
                  <Plus size={15} />
                  Nouveau panneau
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {panels.length === 0 ? (
                <div style={{ background:'var(--orion-surface-2)', border:'1.5px solid var(--orion-line)', borderRadius:6, padding:'32px 24px', textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:12 }}>🎛️</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--orion-text)', marginBottom:8 }}>Aucun panneau pour l'instant</div>
                  <div style={{ fontSize:12, color:'var(--orion-text-mute)', marginBottom:20, lineHeight:1.6 }}>
                    Un panneau définit les boutons que tu utiliseras pendant le codage live.<br />
                    Clique sur <strong style={{ color:'var(--orion-accent)' }}>+ Nouveau panneau</strong> pour créer le tien.
                  </div>
                  <div style={{ padding:'10px 14px', background:'rgba(61,128,224,0.08)', border:'1px solid var(--orion-accent-line)', borderRadius:4, fontSize:12, color:'var(--orion-accent)', display:'inline-block' }}>
                    💡 Le panneau <strong>Football Pro</strong> est créé automatiquement lors de ton premier codage
                  </div>
                </div>
              ) : (
                panels.map((panel) => (
                  <div
                    key={panel.id}
                    style={{ background:"var(--orion-surface)", border:"1.5px solid var(--orion-line)", borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", transition:"border-color .15s" }}
                  >
                    <button
                      onClick={() => openPanel(panel)}
                      className="flex-1 flex items-start gap-3 text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold" style={{ color:'var(--orion-text)' }}>{panel.name}</h3>
                          {panel.is_default && (
                            <span className="text-xs px-2 py-0.5 bg-orange-900/40 text-orion-accent rounded-full font-medium border border-orange-800/50">
                              Défaut
                            </span>
                          )}
                          {panel.use_free_layout && (
                            <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-400 rounded-full font-medium border border-green-800/50">
                              Layout libre
                            </span>
                          )}
                        </div>
                        {panel.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{panel.description}</p>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-gray-600 group-hover:text-gray-400 mt-0.5 transition-colors" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div>
            <h1 className="text-2xl font-medium mb-6" style={{ color:'var(--orion-text)' }}>
              {selectedPanel ? 'Modifier le panneau' : 'Nouveau panneau'}
            </h1>

            <div style={{ background:"var(--orion-surface)", border:"1.5px solid var(--orion-line)", borderRadius:8, padding:"20px 22px" }}>
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700  text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color:'var(--orion-text-dim)' }}>
                  Nom du panneau <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Panneau football"
                  style={{ width:"100%", padding:"8px 12px", background:"var(--orion-surface)", border:"1.5px solid var(--orion-line-strong)", borderRadius:6, color:"var(--orion-text)", fontSize:13, outline:"none", boxSizing:"border-box" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color:'var(--orion-text-dim)' }}>
                  Description <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description du panneau..."
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line  focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-white placeholder-gray-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={savePanel}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-primary hover-orange text-white  transition-colors font-medium disabled:opacity-50"
                >
                  <Check size={16} />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={handleBack}
                  className="px-5 py-2 bg-dark-tertiary text-gray-300  hover:bg-dark-tertiary transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'panel' && selectedPanel && (
          <div>
            {/* Hero sombre */}
            <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'22px 24px 20px', color:'#fff', marginBottom:20, boxShadow:'0 16px 40px -16px rgba(13,17,23,0.4)' }}>
              <div style={{ position:'absolute', top:0, right:0, width:320, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.2), transparent 60%)', pointerEvents:'none' }} />
              <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd', marginBottom:8 }}>Configuration</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#fff' }}>{selectedPanel.name}</h1>
                    {selectedPanel.is_default && (
                      <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(232,146,12,0.2)', border:'1px solid rgba(232,146,12,0.4)', color:'#ffc15e' }}>Défaut</span>
                    )}
                  </div>
                  {selectedPanel.description && <p style={{ margin:'6px 0 0', fontSize:13, color:'#8aa0bd' }}>{selectedPanel.description}</p>}
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  {!selectedPanel.is_default && (
                    <>
                      <button onClick={() => startEdit(selectedPanel)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:999, fontSize:12, fontWeight:600, color:'#dbe3ee', cursor:'pointer' }}>
                        <Pencil size={13} /> Renommer
                      </button>
                      <button onClick={() => deletePanel(selectedPanel.id)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(224,59,46,0.15)', border:'1.5px solid rgba(224,59,46,0.3)', borderRadius:999, fontSize:12, fontWeight:600, color:'#ff8a7a', cursor:'pointer' }}>
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ background:"var(--orion-surface)", border:"1.5px solid var(--orion-line-strong)", borderRadius:10, overflow:"hidden" }}>
              <div style={{ display:"flex", borderBottom:"1.5px solid var(--orion-line)" }}>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'list' ? 'border-b-2 border-orion-accent text-orion-accent bg-white' : 'text-orion-text-mute bg-surface-2 hover:text-orion-text'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Mes boutons
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === 'list' ? 'bg-blue-100 text-orion-accent' : 'bg-gray-100 text-orion-text-mute'
                  }`}>
                    {rootButtons.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('layout')}
                  className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'layout' ? 'border-b-2 border-orion-accent text-orion-accent bg-white' : 'text-orion-text-mute bg-surface-2 hover:text-orion-text'
                  }`}
                >
                  <Move size={14} />
                  Layout libre
                  {selectedPanel?.use_free_layout && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'list' && (
                  <>
                    {rootButtons.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-sm mb-3">Aucun bouton dans ce panneau.</p>
                        <button
                          onClick={() => { setShowCreateForm(true); resetButtonForm(); setActiveTab('list'); }}
                          className="text-orion-accent hover:underline text-sm font-medium"
                        >
                          Créer votre premier bouton
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs text-gray-500">
                            Les boutons événements peuvent avoir des sous-boutons qualificatifs qui s'affichent après le clic en live.
                          </p>
                          <button
                            onClick={() => { setShowCreateForm(true); resetButtonForm(); setActiveTab('list'); }}
                            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--orion-accent)', color:'#fff', border:'none', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}
                          >
                            <Plus size={13} />
                            Bouton
                          </button>
                        </div>
                        {Array.from(new Set(rootButtons.map((b) => b.tab_page ?? 1))).sort((a, b) => a - b).map((page) => (
                          <div key={page} className="mb-6">
                            <div className="text-xs font-semibold uppercase tracking-wider text-orion-accent mb-3 flex items-center gap-2">
                              <span className="w-5 h-5 bg-orange-900/40 border border-orange-800/50 rounded flex items-center justify-center text-[10px]">{page}</span>
                              Page {page}
                            </div>
                            {(() => {
                              const pageRootBtns = rootButtons.filter((b) => (b.tab_page ?? 1) === page);
                              const pageGroups = Array.from(new Set(pageRootBtns.map((b) => b.group_name ?? '')));
                              return pageGroups.map((group) => (
                                <div key={group || '__none__'} className="mb-4">
                                  {group && (
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 ml-1">
                                      {group}
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    {pageRootBtns
                                      .filter((b) => (b.group_name ?? '') === group)
                                      .map(renderButtonRow)}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}

                {showCreateForm && activeTab === 'list' && !editingButtonId && (
                  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={() => { resetButtonForm(); setShowCreateForm(false); }}>
                    <div style={{ background:'var(--orion-surface)', borderRadius:14, padding:24, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                      
                      {/* Header modale */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                        <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:'var(--orion-text)' }}>
                          {parentBtnForForm ? `Sous-bouton de "${parentBtnForForm.label}"` : 'Nouveau bouton'}
                        </h2>
                        <button onClick={() => { resetButtonForm(); setShowCreateForm(false); }} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:6, border:'1.5px solid var(--orion-line)', background:'var(--orion-surface-2)', cursor:'pointer', color:'var(--orion-text-mute)' }}>
                          <X size={16} />
                        </button>
                      </div>

                    <div className="max-w-lg space-y-5">
                    {parentBtnForForm && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:6, border:'1px solid rgba(31,168,90,0.3)', background:'rgba(31,168,90,0.06)' }}>
                        <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: parentBtnForForm.color }} />
                        <span style={{ fontSize:12, color:'#1FA85A', fontWeight:500 }}>Sous-bouton de : {parentBtnForForm.label}</span>
                        <button onClick={() => { setParentButtonId(null); setButtonType('event'); setButtonColor('#dc2626'); }} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)' }}>
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setButtonType('event');
                          if (buttonColor === '#2563eb') setButtonColor('#dc2626');
                        }}
                        className={`p-3  border-2 transition-all text-left ${
                          buttonType === 'event'
                            ? 'border-red-400 bg-red-50'
                            : 'border-orion-line bg-surface hover:border-gray-400'
                        }`}
                      >
                        <div className="text-sm font-bold mb-0.5" style={{ color:'var(--orion-text)' }}>Événement</div>
                        <div className="text-xs text-gray-400">Crée un événement horodaté</div>
                      </button>
                      <button
                        onClick={() => {
                          setButtonType('keyword');
                          if (buttonColor === '#dc2626') setButtonColor('#2563eb');
                        }}
                        className={`p-3  border-2 transition-all text-left ${
                          buttonType === 'keyword'
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-orion-line bg-surface hover:border-gray-400'
                        }`}
                      >
                        <div className="text-sm font-bold mb-0.5" style={{ color:'var(--orion-text)' }}>Qualificatif</div>
                        <div className="text-xs text-gray-400">Précise le dernier événement</div>
                      </button>
                    </div>

                    {!parentButtonId && (
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color:'var(--orion-text-dim)' }}>Localisation</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            onClick={() => { setLocationMode('none'); setIsZone(false); }}
                            className={`p-3  border-2 transition-all text-center ${
                              locationMode === 'none'
                                ? 'border-gray-400 bg-gray-800/40'
                                : 'border-orion-line bg-dark-tertiary hover:border-gray-600'
                            }`}
                          >
                            <div className="text-sm font-bold mb-0.5" style={{ color:'var(--orion-text)' }}>Normal</div>
                            <div className="text-[10px] text-gray-400">Pas de localisation</div>
                          </button>
                          <button
                            onClick={() => { setLocationMode('zones'); setIsZone(false); }}
                            className={`p-3  border-2 transition-all text-center ${
                              locationMode === 'zones'
                                ? 'border-blue-500 bg-blue-900/20'
                                : 'border-orion-line bg-dark-tertiary hover:border-gray-600'
                            }`}
                          >
                            <div className="text-sm font-bold mb-0.5" style={{ color:'var(--orion-text)' }}>3 Zones</div>
                            <div className="text-[10px] text-gray-400">Déf / Méd / Off</div>
                          </button>
                          <button
                            onClick={() => { setLocationMode('field'); setIsZone(false); }}
                            className={`p-3  border-2 transition-all text-center ${
                              locationMode === 'field'
                                ? 'border-orange-500 bg-orange-900/20'
                                : 'border-orion-line bg-dark-tertiary hover:border-gray-600'
                            }`}
                          >
                            <div className="text-sm font-bold mb-0.5" style={{ color:'var(--orion-text)' }}>Position</div>
                            <div className="text-[10px] text-gray-400">Terrain cliquable</div>
                          </button>
                          <button
                            onClick={() => { setLocationMode('field_and_goal'); setIsZone(false); }}
                            className={`p-3  border-2 transition-all text-center ${
                              locationMode === 'field_and_goal'
                                ? 'border-red-500 bg-red-900/20'
                                : 'border-orion-line bg-dark-tertiary hover:border-gray-600'
                            }`}
                          >
                            <div className="text-sm font-bold mb-0.5" style={{ color:'var(--orion-text)' }}>Position + But</div>
                            <div className="text-[10px] text-gray-400">Terrain + cage</div>
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color:'var(--orion-text-dim)' }}>
                        Étiquette <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        placeholder="Nom du bouton"
                        style={{ width:"100%", padding:"8px 12px", background:"var(--orion-surface)", border:"1.5px solid var(--orion-line-strong)", borderRadius:6, color:"var(--orion-text)", fontSize:13, outline:"none", boxSizing:"border-box" }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color:'var(--orion-text-dim)' }}>
                        Type d'événement <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                      </label>
                      <select
                        value={selectedEventTypeId}
                        onChange={(e) => handleEventTypeSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line  text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">-- Non assigné --</option>
                        {Object.entries(groupedEventTypes).map(([category, types]) => (
                          <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                            {types.map((et) => (
                              <option key={et.id} value={et.id}>{et.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color:'var(--orion-text-dim)' }}>Couleur</label>
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 mb-2">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setButtonColor(c)}
                              className={`w-7 h-7 rounded transition-transform hover:scale-110 ${
                                buttonColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-secondary scale-110' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={buttonColor}
                            onChange={(e) => setButtonColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border border-orion-line bg-transparent"
                          />
                          <span className="text-xs text-gray-500">Personnalisée</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color:'var(--orion-text-dim)' }}>Aperçu</label>
                        <div
                          className="relative flex flex-col items-center justify-center gap-1  text-white"
                          style={{ backgroundColor: buttonColor, minHeight: '72px', padding: '10px 8px' }}
                        >
                          <span className="text-sm font-bold leading-tight text-center">
                            {buttonLabel || 'Aperçu'}
                          </span>
                          <span className="text-[9px] uppercase opacity-60 tracking-wider">
                            {buttonType === 'event' ? 'ÉVÉNEMENT' : 'QUALIFICATIF'}
                          </span>
                          {buttonShortcut && (
                            <span className="absolute top-1 right-1.5 text-[9px] font-mono opacity-50">
                              {buttonShortcut.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {!parentBtnForForm && (
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color:'var(--orion-text-dim)' }}>
                            Page
                          </label>
                          <div className="flex gap-2">
                            {[1, 2, 3].map((p) => (
                              <button
                                key={p}
                                onClick={() => setButtonTabPage(p)}
                                className={`flex-1 py-2  text-sm font-bold transition-colors ${
                                  buttonTabPage === p
                                    ? 'bg-orange-primary text-white'
                                    : 'bg-dark-tertiary text-gray-400 hover:bg-dark-tertiary'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color:'var(--orion-text-dim)' }}>
                          Raccourci clavier <span className="text-gray-500 font-normal text-xs">(1 touche)</span>
                        </label>
                        <input
                          type="text"
                          value={buttonShortcut}
                          onChange={(e) => setButtonShortcut(e.target.value.slice(-1))}
                          maxLength={1}
                          placeholder="Ex: s, p, t..."
                          className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line  text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-mono uppercase"
                        />
                      </div>
                    </div>

                    {!parentBtnForForm && (
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color:'var(--orion-text-dim)' }}>
                          Groupe <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                        </label>
                        <input
                          type="text"
                          value={buttonGroup}
                          onChange={(e) => setButtonGroup(e.target.value)}
                          placeholder="Ex: Attaque, Défense..."
                          list="group-suggestions"
                          style={{ width:"100%", padding:"8px 12px", background:"var(--orion-surface)", border:"1.5px solid var(--orion-line-strong)", borderRadius:6, color:"var(--orion-text)", fontSize:13, outline:"none", boxSizing:"border-box" }}
                        />
                        {existingGroups.length > 0 && (
                          <datalist id="group-suggestions">
                            {existingGroups.map((g) => <option key={g} value={g} />)}
                          </datalist>
                        )}
                      </div>
                    )}

                    {!parentBtnForForm && (
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color:'var(--orion-text-dim)' }}>
                          Équipe <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setButtonTeamAssociation(null)}
                            className={`flex-1 py-2 px-3  text-sm font-medium transition-colors ${
                              buttonTeamAssociation === null
                                ? 'bg-orange-primary text-white'
                                : 'bg-dark-tertiary text-gray-400 hover:bg-dark-tertiary border border-orion-line'
                            }`}
                          >
                            Les deux équipes
                          </button>
                          <button
                            onClick={() => setButtonTeamAssociation('A')}
                            className={`flex-1 py-2 px-3  text-sm font-medium transition-colors ${
                              buttonTeamAssociation === 'A'
                                ? 'bg-green-600 text-white'
                                : 'bg-dark-tertiary text-gray-400 hover:bg-dark-tertiary border border-orion-line'
                            }`}
                          >
                            Équipe A
                          </button>
                          <button
                            onClick={() => setButtonTeamAssociation('B')}
                            className={`flex-1 py-2 px-3  text-sm font-medium transition-colors ${
                              buttonTeamAssociation === 'B'
                                ? 'bg-blue-600 text-white'
                                : 'bg-dark-tertiary text-gray-400 hover:bg-dark-tertiary border border-orion-line'
                            }`}
                          >
                            Équipe B
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ display:'flex', gap:10, paddingTop:8 }}>
                      <button
                        onClick={addButton}
                        disabled={saving || !buttonLabel.trim()}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', background:'var(--orion-accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity: (saving || !buttonLabel.trim()) ? 0.5 : 1 }}
                      >
                        <Check size={14} />
                        {editingButtonId ? (saving ? 'Sauvegarde...' : 'Mettre à jour') : (saving ? 'Création...' : (parentBtnForForm ? 'Créer le sous-bouton' : 'Créer le bouton'))}
                      </button>
                      <button
                        onClick={() => { resetButtonForm(); setShowCreateForm(false); }}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px', background:'var(--orion-surface-2)', border:'1.5px solid var(--orion-line)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--orion-text-dim)', cursor:'pointer' }}
                      >
                        <X size={14} />
                        Annuler
                      </button>
                    </div>
                    </div>
                    </div>
                  </div>
                )}

                {activeTab === 'layout' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center justify-between flex-1 p-4  border border-orion-line bg-dark-tertiary/40">
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-0.5">Mode layout libre</h3>
                          <p className="text-xs text-gray-500">
                            Positionnez librement vos boutons sur la grille.
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFreeLayout(selectedPanel)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
                            selectedPanel.use_free_layout ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                              selectedPanel.use_free_layout ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <button
                        onClick={() => { setShowCreateForm(true); resetButtonForm(); setActiveTab('list'); }}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-primary hover-orange text-white  transition-colors text-sm font-medium flex-shrink-0"
                      >
                        <Plus size={15} />
                        Bouton
                      </button>
                    </div>

                    {rootButtons.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-orion-line ">
                        <p className="text-sm mb-2">Aucun bouton à positionner.</p>
                        <button
                          onClick={() => { setShowCreateForm(true); resetButtonForm(); setActiveTab('list'); }}
                          className="text-orion-accent hover:underline text-sm"
                        >
                          Créer votre premier bouton
                        </button>
                      </div>
                    ) : (
                      <FreeLayoutEditor
                        panelId={selectedPanel.id}
                        buttons={rootButtons}
                        onUpdate={() => loadPanelButtons(selectedPanel.id)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
