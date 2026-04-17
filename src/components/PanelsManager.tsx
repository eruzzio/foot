import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Panel, PanelButtonWithEventType, EventType } from '../types/database';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, ChevronRight, ChevronDown, GripVertical, LayoutGrid, Move, Tag, MapPin } from 'lucide-react';
import { createDefaultFootballPanel } from '../utils/createDefaultPanel';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await createDefaultFootballPanel(userData.user.id);
    }
    await Promise.all([loadPanels(), loadEventTypes()]);
    setLoading(false);
  };

  const loadPanels = async () => {
    const { data, error } = await supabase
      .from('panels')
      .select('*')
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

  const startCreate = () => {
    setFormName('');
    setFormDescription('');
    setError('');
    setSelectedPanel(null);
    setView('create');
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
      alert('Erreur lors de la suppression du panneau');
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
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-dark-tertiary/40 group">
          <GripVertical size={15} className="text-gray-700 flex-shrink-0" />
          <div
            className="w-3.5 h-3.5 rounded flex-shrink-0"
            style={{ backgroundColor: button.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{button.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                button.button_type === 'event'
                  ? 'bg-red-900/40 text-red-400'
                  : 'bg-blue-900/40 text-blue-400'
              }`}>
                {button.button_type === 'event' ? 'Événement' : 'Qualificatif'}
              </span>
              {button.team_association && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  button.team_association === 'A'
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-blue-900/40 text-blue-400'
                }`}>
                  Équipe {button.team_association}
                </span>
              )}
              {button.shortcut_key && (
                <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-1 rounded">
                  {button.shortcut_key.toUpperCase()}
                </span>
              )}
              {button.event_type ? (
                <span className="text-[10px] text-gray-500">({button.event_type.name})</span>
              ) : (
                <span className="text-[10px] text-amber-500 italic">Non assigné</span>
              )}
              {subButtons.length > 0 && (
                <span className="text-[10px] text-gray-500">
                  {subButtons.length} sous-bouton{subButtons.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {subButtons.length > 0 && isExpanded && (
          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-700/50 pl-3">
            {subButtons.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-800/60 bg-dark-tertiary/20 group"
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
                      <span className="text-[9px] font-mono text-gray-600 bg-gray-800 px-1 rounded">
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-green-400 hover:bg-green-900/10 rounded-lg border border-dashed border-gray-700 hover:border-green-800 transition-colors w-full"
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
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-dark-secondary text-gray-300 hover:bg-dark-tertiary rounded-lg border border-gray-700 transition-colors font-medium"
          >
            <ArrowLeft size={18} />
            {view === 'list' ? "Retour à l'accueil" : 'Retour'}
          </button>
          {view !== 'list' && selectedPanel && (
            <span className="text-gray-500 text-sm">{selectedPanel.name}</span>
          )}
        </div>

        {view === 'list' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">Mes Panneaux</h1>
              <button
                onClick={startCreate}
                className="flex items-center gap-2 px-4 py-2 bg-orange-primary hover-orange text-white rounded-lg transition-colors font-medium shadow"
              >
                <Plus size={18} />
                Nouveau panneau
              </button>
            </div>

            <div className="space-y-3">
              {panels.length === 0 ? (
                <div className="bg-dark-secondary rounded-xl border border-gray-800 p-8 text-center text-gray-500">
                  Aucun panneau. Créez-en un pour commencer.
                </div>
              ) : (
                panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="bg-dark-secondary rounded-xl border border-gray-800 p-4 flex items-center justify-between hover:border-gray-600 transition-colors group"
                  >
                    <button
                      onClick={() => openPanel(panel)}
                      className="flex-1 flex items-start gap-3 text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{panel.name}</h3>
                          {panel.is_default && (
                            <span className="text-xs px-2 py-0.5 bg-orange-900/40 text-orange-400 rounded-full font-medium border border-orange-800/50">
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
            <h1 className="text-3xl font-bold text-white mb-6">
              {selectedPanel ? 'Modifier le panneau' : 'Nouveau panneau'}
            </h1>

            <div className="bg-dark-secondary rounded-xl border border-gray-800 p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nom du panneau <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Panneau football"
                  className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description du panneau..."
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-white placeholder-gray-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={savePanel}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-primary hover-orange text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  <Check size={16} />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={handleBack}
                  className="px-5 py-2 bg-dark-tertiary text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'panel' && selectedPanel && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">{selectedPanel.name}</h1>
                  {selectedPanel.is_default && (
                    <span className="text-sm px-3 py-1 bg-orange-900/40 text-orange-400 rounded-full font-medium border border-orange-800/50">
                      Défaut
                    </span>
                  )}
                </div>
                {selectedPanel.description && (
                  <p className="text-gray-500 mt-1">{selectedPanel.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!selectedPanel.is_default && (
                  <>
                    <button
                      onClick={() => startEdit(selectedPanel)}
                      className="flex items-center gap-2 px-3 py-2 bg-dark-secondary text-gray-300 rounded-lg border border-gray-700 hover:bg-dark-tertiary transition-colors text-sm font-medium"
                    >
                      <Pencil size={15} />
                      Renommer
                    </button>
                    <button
                      onClick={() => deletePanel(selectedPanel.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-dark-secondary text-red-400 rounded-lg border border-gray-700 hover:bg-red-900/20 transition-colors text-sm font-medium"
                    >
                      <Trash2 size={15} />
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-dark-secondary rounded-xl border border-gray-800 overflow-hidden">
              <div className="flex border-b border-gray-800">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'list'
                      ? 'bg-dark-secondary text-white border-b-2 border-orange-primary'
                      : 'bg-dark-tertiary/50 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Mes boutons
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === 'list' ? 'bg-orange-900/40 text-orange-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {rootButtons.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('layout')}
                  className={`flex-1 px-4 py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'layout'
                      ? 'bg-dark-secondary text-white border-b-2 border-orange-primary'
                      : 'bg-dark-tertiary/50 text-gray-500 hover:text-gray-300'
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
                          className="text-orange-400 hover:underline text-sm font-medium"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-primary hover-orange text-white rounded-lg text-xs font-medium flex-shrink-0 ml-4"
                          >
                            <Plus size={12} />
                            Bouton
                          </button>
                        </div>
                        {Array.from(new Set(rootButtons.map((b) => b.tab_page ?? 1))).sort((a, b) => a - b).map((page) => (
                          <div key={page} className="mb-6">
                            <div className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-3 flex items-center gap-2">
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

                {showCreateForm && activeTab === 'list' && (
                  <div className="max-w-lg space-y-5">
                    {parentBtnForForm && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-800/50 bg-green-900/10">
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: parentBtnForForm.color }}
                        />
                        <span className="text-xs text-green-400 font-medium">
                          Sous-bouton de : {parentBtnForForm.label}
                        </span>
                        <button
                          onClick={() => { setParentButtonId(null); setButtonType('event'); setButtonColor('#dc2626'); }}
                          className="ml-auto text-gray-500 hover:text-gray-300"
                        >
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
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          buttonType === 'event'
                            ? 'border-red-500 bg-red-900/20'
                            : 'border-gray-700 bg-dark-tertiary hover:border-gray-600'
                        }`}
                      >
                        <div className="text-sm font-bold text-white mb-0.5">Événement</div>
                        <div className="text-xs text-gray-400">Crée un événement horodaté</div>
                      </button>
                      <button
                        onClick={() => {
                          setButtonType('keyword');
                          if (buttonColor === '#dc2626') setButtonColor('#2563eb');
                        }}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          buttonType === 'keyword'
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-700 bg-dark-tertiary hover:border-gray-600'
                        }`}
                      >
                        <div className="text-sm font-bold text-white mb-0.5">Qualificatif</div>
                        <div className="text-xs text-gray-400">Précise le dernier événement</div>
                      </button>
                    </div>

                    {!parentButtonId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Mode Zone</label>
                        <button
                          onClick={() => setIsZone(!isZone)}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-start gap-3 ${
                            isZone
                              ? 'border-orange-500 bg-orange-900/20'
                              : 'border-gray-700 bg-dark-tertiary hover:border-gray-600'
                          }`}
                        >
                          <div className={`p-1.5 rounded flex-shrink-0 ${isZone ? 'bg-orange-500/30' : 'bg-gray-700/30'}`}>
                            <MapPin size={16} className={isZone ? 'text-orange-400' : 'text-gray-400'} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white mb-0.5">
                              {isZone ? 'Zone activée' : 'Zone désactivée'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {isZone
                                ? 'Ce bouton affichera les zones à cliquer après un événement'
                                : 'Configure ce bouton comme une zone de localisation'}
                            </div>
                          </div>
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Étiquette <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        placeholder="Nom du bouton"
                        className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Type d'événement <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                      </label>
                      <select
                        value={selectedEventTypeId}
                        onChange={(e) => handleEventTypeSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Couleur</label>
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
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
                            className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
                          />
                          <span className="text-xs text-gray-500">Personnalisée</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Aperçu</label>
                        <div
                          className="relative flex flex-col items-center justify-center gap-1 rounded-lg text-white"
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
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Page
                          </label>
                          <div className="flex gap-2">
                            {[1, 2, 3].map((p) => (
                              <button
                                key={p}
                                onClick={() => setButtonTabPage(p)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                                  buttonTabPage === p
                                    ? 'bg-orange-primary text-white'
                                    : 'bg-dark-tertiary text-gray-400 hover:bg-gray-700'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Raccourci clavier <span className="text-gray-500 font-normal text-xs">(1 touche)</span>
                        </label>
                        <input
                          type="text"
                          value={buttonShortcut}
                          onChange={(e) => setButtonShortcut(e.target.value.slice(-1))}
                          maxLength={1}
                          placeholder="Ex: s, p, t..."
                          className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-mono uppercase"
                        />
                      </div>
                    </div>

                    {!parentBtnForForm && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Groupe <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                        </label>
                        <input
                          type="text"
                          value={buttonGroup}
                          onChange={(e) => setButtonGroup(e.target.value)}
                          placeholder="Ex: Attaque, Défense..."
                          list="group-suggestions"
                          className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Équipe <span className="text-gray-500 font-normal text-xs">(optionnel)</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setButtonTeamAssociation(null)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              buttonTeamAssociation === null
                                ? 'bg-orange-primary text-white'
                                : 'bg-dark-tertiary text-gray-400 hover:bg-gray-700 border border-gray-700'
                            }`}
                          >
                            Les deux équipes
                          </button>
                          <button
                            onClick={() => setButtonTeamAssociation('A')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              buttonTeamAssociation === 'A'
                                ? 'bg-green-600 text-white'
                                : 'bg-dark-tertiary text-gray-400 hover:bg-gray-700 border border-gray-700'
                            }`}
                          >
                            Équipe A
                          </button>
                          <button
                            onClick={() => setButtonTeamAssociation('B')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              buttonTeamAssociation === 'B'
                                ? 'bg-blue-600 text-white'
                                : 'bg-dark-tertiary text-gray-400 hover:bg-gray-700 border border-gray-700'
                            }`}
                          >
                            Équipe B
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={addButton}
                        disabled={saving || !buttonLabel.trim()}
                        className="flex items-center gap-2 px-5 py-2 bg-orange-primary hover-orange text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Check size={14} />
                        {editingButtonId ? (
                          saving ? 'Sauvegarde...' : 'Mettre à jour'
                        ) : (
                          saving ? 'Création...' : (parentBtnForForm ? 'Créer le sous-bouton' : 'Créer le bouton')
                        )}
                      </button>
                      <button
                        onClick={() => { resetButtonForm(); setShowCreateForm(false); }}
                        className="flex items-center gap-2 px-5 py-2 bg-dark-tertiary text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        <X size={14} />
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'layout' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center justify-between flex-1 p-4 rounded-lg border border-gray-700 bg-dark-tertiary/40">
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
                        className="flex items-center gap-2 px-4 py-2 bg-orange-primary hover-orange text-white rounded-lg transition-colors text-sm font-medium flex-shrink-0"
                      >
                        <Plus size={15} />
                        Bouton
                      </button>
                    </div>

                    {rootButtons.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-lg">
                        <p className="text-sm mb-2">Aucun bouton à positionner.</p>
                        <button
                          onClick={() => { setShowCreateForm(true); resetButtonForm(); setActiveTab('list'); }}
                          className="text-orange-400 hover:underline text-sm"
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
