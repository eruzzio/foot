import { supabase } from '../lib/supabase';

export async function createDefaultFootballPanel(userId: string) {
  const { data: existingPanels } = await supabase
    .from('panels')
    .select('id')
    .eq('user_id', userId);

  if (existingPanels && existingPanels.length > 0) {
    return;
  }

  const { data: panel, error: panelError } = await supabase
    .from('panels')
    .insert({
      user_id: userId,
      name: 'Football (défaut)',
      description: 'Panneau par défaut pour le codage de matchs de football',
      is_default: true,
      use_free_layout: false,
    })
    .select()
    .single();

  if (panelError || !panel) {
    console.error('Error creating default panel:', panelError);
    return;
  }

  const { data: eventTypes } = await supabase
    .from('event_types')
    .select('*')
    .is('user_id', null);

  if (!eventTypes) return;

  const defaultButtons = [
    { name: 'Tir', category: 'attack' },
    { name: 'Passe', category: 'attack' },
    { name: 'Dribble', category: 'attack' },
    { name: 'Perte', category: 'attack' },
    { name: 'Récupération', category: 'defense' },
    { name: 'Tacle', category: 'defense' },
    { name: 'Faute', category: 'general' },
    { name: 'Interception', category: 'defense' },
  ];

  const buttonsToInsert = defaultButtons
    .map((button, index) => {
      const eventType = eventTypes.find(
        (et) => et.name === button.name && et.category === button.category
      );
      if (!eventType) return null;
      return {
        panel_id: panel.id,
        event_type_id: eventType.id,
        label: eventType.name,
        position: index,
        color: eventType.color,
      };
    })
    .filter((b) => b !== null);

  if (buttonsToInsert.length > 0) {
    await supabase.from('panel_buttons').insert(buttonsToInsert);
  }
}
