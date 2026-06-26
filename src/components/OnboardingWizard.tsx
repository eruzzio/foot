import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronRight, Users, SkipForward, Check } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Créez votre équipe', icon: Users, desc: 'Commencez par créer votre première équipe' },
  { id: 2, title: 'Ajoutez vos joueurs', icon: Users, desc: 'Ajoutez quelques joueurs à votre effectif' },
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [teamName, setTeamName] = useState('');
  const [teamCategory, setTeamCategory] = useState('Senior');
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);

  // Step 2 state
  const [players, setPlayers] = useState([
    { first_name: '', last_name: '' },
    { first_name: '', last_name: '' },
    { first_name: '', last_name: '' },
  ]);

  // Step 3 state
  const [matchTeamA, setMatchTeamA] = useState('');
  const [matchTeamB, setMatchTeamB] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSkip = async () => {
    await markComplete();
    onComplete();
  };

  const markComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('orion_users').update({ onboarding_completed: true }).eq('id', user.id);
  };

  const handleStep1 = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('teams').insert({
        name: teamName.trim(),
        category: teamCategory,
        user_id: user.id,
      }).select().single();
      if (data) {
        setCreatedTeamId(data.id);
        setMatchTeamA(teamName.trim());
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!createdTeamId) { setStep(3); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const validPlayers = players.filter(p => p.first_name.trim() && p.last_name.trim());
      if (validPlayers.length > 0) {
        await supabase.from('players').insert(
          validPlayers.map((p, i) => ({
            first_name: p.first_name.trim(),
            last_name: p.last_name.trim(),
            position: 'MF',
            number: i + 1,
            team_id: createdTeamId,
            user_id: user.id,
          }))
        );
      }
      await markComplete();
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    if (!matchTeamA.trim() || !matchTeamB.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('matches').insert({
        team_a_name: matchTeamA.trim(),
        team_b_name: matchTeamB.trim(),
        match_date: matchDate,
        team_a_id: createdTeamId,
        user_id: user.id,
        status: 'upcoming',
      });
      await markComplete();
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const CATEGORIES = ['U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Senior', 'Vétérans'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--orion-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚽</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--orion-text)', marginBottom: 6 }}>Bienvenue sur ORION</h1>
          <p style={{ fontSize: 13, color: 'var(--orion-text-mute)' }}>Configurons votre espace en 2 étapes rapides</p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <>
              <div key={s.id} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: step > s.id ? 'var(--orion-green)' : step === s.id ? 'var(--orion-accent)' : 'var(--orion-surface-2)',
                border: `2px solid ${step >= s.id ? 'transparent' : 'var(--orion-line)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: step >= s.id ? '#fff' : 'var(--orion-text-mute)',
                transition: 'all 0.2s',
              }}>
                {step > s.id ? <Check size={14} /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div key={`line-${i}`} style={{ height: 2, width: 40, background: step > s.id + 0 ? 'var(--orion-accent)' : 'var(--orion-line)', transition: 'all 0.2s' }} />
              )}
            </>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: 'var(--orion-surface)', border: '1.5px solid var(--orion-line)', borderRadius: 12, padding: 28 }}>

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-text)', marginBottom: 4 }}>Créez votre équipe</h2>
              <p style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 20 }}>Donnez un nom à votre équipe et choisissez sa catégorie</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Nom de l'équipe *</label>
                <input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStep1()}
                  placeholder="Ex: AS Béziers U17, FC Lyon Senior..."
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Catégorie</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setTeamCategory(cat)} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: teamCategory === cat ? 'var(--orion-accent)' : 'var(--orion-surface-2)',
                      border: `1.5px solid ${teamCategory === cat ? 'var(--orion-accent)' : 'var(--orion-line)'}`,
                      color: teamCategory === cat ? '#fff' : 'var(--orion-text-mute)',
                    }}>{cat}</button>
                  ))}
                </div>
              </div>

              <button onClick={handleStep1} disabled={!teamName.trim() || loading} className="o-btn o-btn--primary" style={{ width: '100%', padding: '12px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Création...' : <>Continuer <ChevronRight size={16} /></>}
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-text)', marginBottom: 4 }}>Ajoutez vos joueurs</h2>
              <p style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 20 }}>Ajoutez quelques joueurs pour commencer (vous pourrez en ajouter d'autres plus tard)</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {players.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--orion-text-mute)', width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                    <input
                      value={p.first_name}
                      onChange={e => setPlayers(prev => prev.map((pl, idx) => idx === i ? { ...pl, first_name: e.target.value } : pl))}
                      placeholder="Prénom"
                      style={{ flex: 1, padding: '8px 10px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)', fontSize: 12 }}
                    />
                    <input
                      value={p.last_name}
                      onChange={e => setPlayers(prev => prev.map((pl, idx) => idx === i ? { ...pl, last_name: e.target.value } : pl))}
                      placeholder="Nom"
                      style={{ flex: 1, padding: '8px 10px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)', fontSize: 12 }}
                    />
                  </div>
                ))}
                <button onClick={() => setPlayers(prev => [...prev, { first_name: '', last_name: '' }])} style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--orion-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                  + Ajouter une ligne
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { await markComplete(); onComplete(); }} style={{ flex: 1, padding: '10px', fontSize: 13, background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text-mute)', cursor: 'pointer' }}>
                  Passer cette étape
                </button>
                <button onClick={handleStep2} disabled={loading} className="o-btn o-btn--primary" style={{ flex: 2, padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {loading ? 'Enregistrement...' : <>Continuer <ChevronRight size={15} /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-text)', marginBottom: 4 }}>Créez votre premier match</h2>
              <p style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 20 }}>Préparez un match à venir pour commencer l'analyse</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Votre équipe *</label>
                  <input value={matchTeamA} onChange={e => setMatchTeamA(e.target.value)} placeholder="Nom de votre équipe" style={{ width: '100%', padding: '10px 12px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Adversaire *</label>
                  <input value={matchTeamB} onChange={e => setMatchTeamB(e.target.value)} placeholder="Nom de l'équipe adverse" style={{ width: '100%', padding: '10px 12px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--orion-text-mute)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Date du match</label>
                  <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text)', fontSize: 13, boxSizing: 'border-box', colorScheme: 'dark' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSkip} style={{ flex: 1, padding: '10px', fontSize: 13, background: 'var(--orion-surface-2)', border: '1.5px solid var(--orion-line)', borderRadius: 6, color: 'var(--orion-text-mute)', cursor: 'pointer' }}>
                  Passer
                </button>
                <button onClick={handleStep3} disabled={!matchTeamA.trim() || !matchTeamB.trim() || loading} className="o-btn o-btn--primary" style={{ flex: 2, padding: '10px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {loading ? 'Création...' : <>Terminer la configuration ✓</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip all */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={handleSkip} style={{ fontSize: 12, color: 'var(--orion-text-mute)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <SkipForward size={13} /> Passer l'assistant et accéder directement à l'app
          </button>
        </div>

      </div>
    </div>
  );
}
