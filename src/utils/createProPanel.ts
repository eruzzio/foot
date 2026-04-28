import { supabase } from '../lib/supabase';

export async function createProFootballPanel(userId: string): Promise<string | null> {
  // Créer le panneau
  const { data: panel, error: panelError } = await supabase
    .from('panels')
    .insert({
      user_id: userId,
      name: 'Football Pro',
      description: 'Panneau complet pour le codage de matchs de football — attaque, défense, phases arrêtées',
      is_default: false,
      use_free_layout: false,
    })
    .select()
    .single();

  if (panelError || !panel) {
    console.error('Error creating pro panel:', panelError);
    return null;
  }

  // Récupérer les event types existants
  const { data: eventTypes } = await supabase
    .from('event_types')
    .select('*');

  const findOrCreateEventType = async (name: string, category: string, color: string, hasOutcome: boolean) => {
    const existing = eventTypes?.find(et => et.name === name);
    if (existing) return existing.id;

    const { data } = await supabase
      .from('event_types')
      .insert({ name, category, color, has_outcome: hasOutcome, icon: 'circle', user_id: userId })
      .select()
      .single();
    return data?.id || null;
  };

  // ===== PAGE 1 : ACTIONS DE JEU =====

  const page1Buttons = [
    // Attaque
    { label: 'Tir', category: 'attack', color: '#10B981', hasOutcome: true, locMode: 'field_and_goal', position: 0,
      subs: [
        { label: 'Pied droit', color: '#059669' },
        { label: 'Pied gauche', color: '#047857' },
        { label: 'Tête', color: '#065F46' },
      ]
    },
    { label: 'Passe', category: 'attack', color: '#3B82F6', hasOutcome: true, locMode: 'zones', position: 1,
      subs: [
        { label: 'Courte', color: '#2563EB' },
        { label: 'Longue', color: '#1D4ED8' },
        { label: 'Centre', color: '#1E40AF' },
        { label: 'En profondeur', color: '#1E3A8A' },
      ]
    },
    { label: 'Dribble', category: 'attack', color: '#8B5CF6', hasOutcome: true, locMode: 'zones', position: 2,
      subs: [
        { label: 'Réussi', color: '#7C3AED' },
        { label: 'Raté', color: '#6D28D9' },
      ]
    },
    { label: 'Perte', category: 'attack', color: '#EF4444', hasOutcome: false, locMode: 'zones', position: 3,
      subs: [
        { label: 'Mauvais contrôle', color: '#DC2626' },
        { label: 'Mauvaise passe', color: '#B91C1C' },
        { label: 'Dépossédé', color: '#991B1B' },
      ]
    },
    // Défense
    { label: 'Récupération', category: 'defense', color: '#14B8A6', hasOutcome: false, locMode: 'zones', position: 4,
      subs: [
        { label: 'Interception', color: '#0D9488' },
        { label: 'Duel gagné', color: '#0F766E' },
        { label: 'Pressing', color: '#115E59' },
      ]
    },
    { label: 'Tacle', category: 'defense', color: '#6366F1', hasOutcome: true, locMode: 'zones', position: 5,
      subs: [
        { label: 'Réussi', color: '#4F46E5' },
        { label: 'Raté', color: '#4338CA' },
      ]
    },
    { label: 'Faute', category: 'general', color: '#F59E0B', hasOutcome: false, locMode: 'field', position: 6,
      subs: [
        { label: 'Carton jaune', color: '#D97706' },
        { label: 'Carton rouge', color: '#DC2626' },
        { label: 'Sans carton', color: '#B45309' },
      ]
    },
    { label: 'Duel aérien', category: 'defense', color: '#06B6D4', hasOutcome: true, locMode: 'zones', position: 7,
      subs: [
        { label: 'Gagné', color: '#0891B2' },
        { label: 'Perdu', color: '#0E7490' },
      ]
    },
  ];

  // ===== PAGE 2 : PHASES ARRÊTÉES & GARDIEN =====

  const page2Buttons = [
    { label: 'Corner', category: 'set_piece', color: '#F97316', hasOutcome: false, locMode: 'none', position: 0,
      subs: [
        { label: 'Sortant', color: '#EA580C' },
        { label: 'Rentrant', color: '#C2410C' },
        { label: 'Court', color: '#9A3412' },
      ]
    },
    { label: 'Coup franc', category: 'set_piece', color: '#EC4899', hasOutcome: false, locMode: 'field', position: 1,
      subs: [
        { label: 'Direct', color: '#DB2777' },
        { label: 'Indirect', color: '#BE185D' },
      ]
    },
    { label: 'Penalty', category: 'set_piece', color: '#DC2626', hasOutcome: true, locMode: 'field_and_goal', position: 2,
      subs: [
        { label: 'But', color: '#16A34A' },
        { label: 'Arrêté', color: '#CA8A04' },
        { label: 'Manqué', color: '#991B1B' },
      ]
    },
    { label: 'Touche', category: 'set_piece', color: '#78716C', hasOutcome: false, locMode: 'none', position: 3, subs: [] },
    { label: 'Arrêt GK', category: 'goalkeeper', color: '#CA8A04', hasOutcome: false, locMode: 'field_and_goal', position: 4,
      subs: [
        { label: 'Plongeon', color: '#A16207' },
        { label: 'Réflexe', color: '#854D0E' },
        { label: 'Sortie', color: '#713F12' },
        { label: 'Boxe', color: '#78350F' },
      ]
    },
    { label: 'Relance GK', category: 'goalkeeper', color: '#A3E635', hasOutcome: true, locMode: 'none', position: 5,
      subs: [
        { label: 'Au pied', color: '#84CC16' },
        { label: 'À la main', color: '#65A30D' },
        { label: 'Longue', color: '#4D7C0F' },
      ]
    },
    { label: 'Hors-jeu', category: 'general', color: '#A1A1AA', hasOutcome: false, locMode: 'field', position: 6, subs: [] },
    { label: 'Remplacement', category: 'general', color: '#71717A', hasOutcome: false, locMode: 'none', position: 7, subs: [] },
  ];

  // Insérer les boutons page par page
  for (const page of [{ buttons: page1Buttons, pageNum: 1 }, { buttons: page2Buttons, pageNum: 2 }]) {
    for (const btn of page.buttons) {
      const eventTypeId = await findOrCreateEventType(btn.label, btn.category, btn.color, btn.hasOutcome);
      if (!eventTypeId) continue;

      const { data: parentBtn } = await supabase
        .from('panel_buttons')
        .insert({
          panel_id: panel.id,
          event_type_id: eventTypeId,
          label: btn.label,
          position: btn.position,
          color: btn.color,
          button_type: 'event',
          tab_page: page.pageNum,
          location_mode: btn.locMode,
          is_zone: false,
          display_order: btn.position,
          group_name: null,
          parent_button_id: null,
          team_association: null,
        })
        .select()
        .single();

      if (parentBtn && btn.subs.length > 0) {
        const subButtons = btn.subs.map((sub, i) => ({
          panel_id: panel.id,
          event_type_id: eventTypeId,
          label: sub.label,
          position: i,
          color: sub.color,
          button_type: 'keyword' as const,
          tab_page: page.pageNum,
          location_mode: 'none' as const,
          is_zone: false,
          display_order: i,
          group_name: null,
          parent_button_id: parentBtn.id,
          team_association: null,
        }));
        await supabase.from('panel_buttons').insert(subButtons);
      }
    }
  }

  return panel.id;
}
