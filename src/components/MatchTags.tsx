import { useState } from 'react';
import { Tag, Save, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match } from '../types/database';

interface MatchTagsProps {
  matchId?: string;
  match: Match;
  onUpdate: (updated: Partial<Match>) => void;
}

const COMPETITIONS = ['Championnat', 'Coupe Régionale', 'Coupe de France', 'Coupe Gambardella', 'Amical', 'Tournoi'];

export default function MatchTags({ matchId, match, onUpdate }: MatchTagsProps) {
  const [tags, setTags] = useState({
    tag_competition: match.tag_competition || '',
    tag_venue: match.tag_venue || '',
    tag_stake: match.tag_stake || '',
    tag_surface: match.tag_surface || '',
    tag_weather: match.tag_weather || '',
    tag_notes: match.tag_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('matches')
      .update({
        tag_competition: tags.tag_competition || null,
        tag_venue: tags.tag_venue || null,
        tag_stake: tags.tag_stake || null,
        tag_surface: tags.tag_surface || null,
        tag_weather: tags.tag_weather || null,
        tag_notes: tags.tag_notes || null,
      })
      .eq('id', matchId || '')
      .eq('user_id', user?.id || '');

    if (!error) {
      onUpdate(tags as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  const TagButton = ({ value, current, label, emoji, onChange }: {
    value: string; current: string; label: string; emoji: string;
    onChange: (v: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(current === value ? '' : value)}
      className={`flex items-center gap-2 px-3 py-2  text-sm font-medium transition-all ${
        current === value
          ? 'bg-orange-primary text-white'
          : 'bg-dark-tertiary text-gray-400 border border-orion-line hover:text-white hover:border-gray-600'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-dark-secondary border border-orion-line rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={18} className="text-orange-primary" />
          <h3 className="text-base font-bold text-white">Tags contextuels</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2  text-sm font-semibold transition-all ${
            saved ? 'bg-green-600 text-white' : 'bg-orange-primary hover:bg-orange-600 text-white'
          }`}
        >
          {saved ? <><Check size={14} /> Sauvegardé</> : <><Save size={14} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}</>}
        </button>
      </div>

      {saveError && (
        <div style={{ padding:'8px 12px', background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:4, fontSize:12, color:'var(--orion-red)' }}>
          {saveError}
        </div>
      )}

      {/* Compétition */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          🏆 Compétition
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {COMPETITIONS.map(c => (
            <TagButton key={c} value={c} current={tags.tag_competition} label={c} emoji=""
              onChange={v => setTags(t => ({ ...t, tag_competition: v }))}
            />
          ))}
        </div>
        <input
          type="text"
          value={tags.tag_competition}
          onChange={e => setTags(t => ({ ...t, tag_competition: e.target.value }))}
          placeholder="Ou saisir manuellement..."
          className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary placeholder-gray-600"
        />
      </div>

      {/* Lieu */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          📍 Lieu de la rencontre
        </label>
        <div className="flex flex-wrap gap-2">
          <TagButton value="home" current={tags.tag_venue} label="Domicile" emoji="🏠"
            onChange={v => setTags(t => ({ ...t, tag_venue: v }))} />
          <TagButton value="away" current={tags.tag_venue} label="Extérieur" emoji="✈️"
            onChange={v => setTags(t => ({ ...t, tag_venue: v }))} />
          <TagButton value="neutral" current={tags.tag_venue} label="Terrain neutre" emoji="⚖️"
            onChange={v => setTags(t => ({ ...t, tag_venue: v }))} />
        </div>
      </div>

      {/* Enjeu */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          🎯 Enjeu du match
        </label>
        <div className="flex flex-wrap gap-2">
          <TagButton value="decisive" current={tags.tag_stake} label="Match décisif" emoji="🔥"
            onChange={v => setTags(t => ({ ...t, tag_stake: v }))} />
          <TagButton value="normal" current={tags.tag_stake} label="Match normal" emoji="⚽"
            onChange={v => setTags(t => ({ ...t, tag_stake: v }))} />
          <TagButton value="friendly" current={tags.tag_stake} label="Amical / Sans enjeu" emoji="🤝"
            onChange={v => setTags(t => ({ ...t, tag_stake: v }))} />
        </div>
      </div>

      {/* Surface */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          🌿 Surface de jeu
        </label>
        <div className="flex flex-wrap gap-2">
          <TagButton value="grass" current={tags.tag_surface} label="Pelouse naturelle" emoji="🌱"
            onChange={v => setTags(t => ({ ...t, tag_surface: v }))} />
          <TagButton value="synthetic" current={tags.tag_surface} label="Synthétique" emoji="🟩"
            onChange={v => setTags(t => ({ ...t, tag_surface: v }))} />
        </div>
      </div>

      {/* Météo */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          🌤️ Conditions météo
        </label>
        <div className="flex flex-wrap gap-2">
          <TagButton value="sun" current={tags.tag_weather} label="Beau temps" emoji="☀️"
            onChange={v => setTags(t => ({ ...t, tag_weather: v }))} />
          <TagButton value="rain" current={tags.tag_weather} label="Pluie" emoji="🌧️"
            onChange={v => setTags(t => ({ ...t, tag_weather: v }))} />
          <TagButton value="wind" current={tags.tag_weather} label="Vent fort" emoji="💨"
            onChange={v => setTags(t => ({ ...t, tag_weather: v }))} />
          <TagButton value="snow" current={tags.tag_weather} label="Neige / Froid" emoji="❄️"
            onChange={v => setTags(t => ({ ...t, tag_weather: v }))} />
        </div>
      </div>

      {/* Notes libres */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          📝 Notes libres
        </label>
        <textarea
          value={tags.tag_notes}
          onChange={e => setTags(t => ({ ...t, tag_notes: e.target.value }))}
          rows={3}
          placeholder="Contexte particulier, adversaire clé, conditions particulières, observations..."
          className="w-full px-3 py-2 bg-dark-tertiary border border-orion-line text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-primary placeholder-gray-600 resize-none"
        />
      </div>

      {/* Résumé des tags actifs */}
      {(tags.tag_competition || tags.tag_venue || tags.tag_stake || tags.tag_surface || tags.tag_weather) && (
        <div className="bg-dark-tertiary rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Tags actifs</div>
          <div className="flex flex-wrap gap-2">
            {tags.tag_competition && (
              <span className="px-2 py-1 bg-orange-primary/20 text-orange-300 rounded-full text-xs font-medium border border-orion-accent/30">
                🏆 {tags.tag_competition}
              </span>
            )}
            {tags.tag_venue && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
                {tags.tag_venue === 'home' ? '🏠 Domicile' : tags.tag_venue === 'away' ? '✈️ Extérieur' : '⚖️ Neutre'}
              </span>
            )}
            {tags.tag_stake && (
              <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-medium border border-red-500/30">
                {tags.tag_stake === 'decisive' ? '🔥 Décisif' : tags.tag_stake === 'friendly' ? '🤝 Amical' : '⚽ Normal'}
              </span>
            )}
            {tags.tag_surface && (
              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium border border-green-500/30">
                {tags.tag_surface === 'grass' ? '🌱 Pelouse' : '🟩 Synthétique'}
              </span>
            )}
            {tags.tag_weather && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium border border-yellow-500/30">
                {tags.tag_weather === 'sun' ? '☀️ Beau' : tags.tag_weather === 'rain' ? '🌧️ Pluie' : tags.tag_weather === 'wind' ? '💨 Vent' : '❄️ Neige'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
