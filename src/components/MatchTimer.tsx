import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Upload, Users, Timer, Zap } from 'lucide-react';

interface MatchTimerProps {
  onTimeUpdate: (seconds: number) => void;
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  currentTime: number;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  selectedTeam: 'A' | 'B';
  onScoreChange: (team: 'A' | 'B', increment: number) => void;
  onSelectTeam: (team: 'A' | 'B') => void;
  onOpenFormation: (team: 'A' | 'B') => void;
  teamAColor?: string;
  teamALogoUrl?: string;
  halftimes: number[];
  onHalftime: () => void;
  kickoffRealTime?: Date | null;
  onKickoff?: (realTime: Date) => void;
  possessionTeam?: 'A' | 'B' | null;
  onTogglePossession?: (team: 'A' | 'B') => void;
  possessionSeconds?: { A: number; B: number };
}

export default function MatchTimer({
  onTimeUpdate, isRunning, onToggle, onReset, currentTime,
  teamAName, teamBName, teamAScore, teamBScore, selectedTeam,
  onScoreChange, onSelectTeam, onOpenFormation,
  teamAColor = '#5BE3FF', teamALogoUrl = '',
  halftimes, onHalftime, kickoffRealTime, onKickoff,
  possessionTeam, onTogglePossession, possessionSeconds,
}: MatchTimerProps) {
  const [logoA, setLogoA] = useState<string | null>(teamALogoUrl || null);
  const [logoB, setLogoB] = useState<string | null>(null);
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const baseTimeRef = useRef<number>(0);

  useEffect(() => { if (teamALogoUrl && !logoA) setLogoA(teamALogoUrl); }, [teamALogoUrl]);

  useEffect(() => {
    let animFrame: number | undefined;
    if (isRunning) {
      startTimeRef.current = Date.now();
      baseTimeRef.current = currentTime;
      const tick = () => {
        const elapsed = Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000);
        const newTime = baseTimeRef.current + elapsed;
        if (newTime !== currentTime) onTimeUpdate(newTime);
        animFrame = requestAnimationFrame(tick);
      };
      animFrame = requestAnimationFrame(tick);
    } else { startTimeRef.current = null; }
    return () => { if (animFrame) cancelAnimationFrame(animFrame); };
  }, [isRunning]);

  const formatTime = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const ringOffset = Math.round(289 * (1 - Math.min(1, currentTime / 5400)));

  const handleLogoUpload = (team: 'A'|'B', file: File) => {
    const url = URL.createObjectURL(file);
    if (team === 'A') setLogoA(url); else setLogoB(url);
  };

  const TeamSide = ({ team, logo, inputRef, name, score, color }: {
    team: 'A'|'B'; logo: string|null; inputRef: React.RefObject<HTMLInputElement>;
    name: string; score: number; color: string;
  }) => {
    const isSelected = selectedTeam === team;
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, flex:1 }}>
        {/* Logo */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{ width:52, height:52, borderRadius:14, border:`1px solid ${isSelected ? color : 'var(--orion-line-strong)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', transition:'border-color .15s' }}
        >
          {logo ? <img src={logo} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} /> : <Upload size={16} style={{ color:'var(--orion-text-mute)' }} />}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(team, f); e.target.value=''; }} />

        {/* Nom */}
        <button onClick={() => onSelectTeam(team)} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <span className="o-eyebrow" style={{ color: isSelected ? color : 'var(--orion-text-mute)', transition:'color .15s' }}>
            {name}
          </span>
        </button>

        {/* Score */}
        <div className="o-display" style={{ fontSize:52, color: isSelected ? color : 'var(--orion-text-mute)', transition:'color .15s', lineHeight:1 }}>
          {score}
        </div>

        {/* Boutons score */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
          <button
            onClick={() => { if (navigator.vibrate) navigator.vibrate(40); onScoreChange(team, 1); }}
            className="o-btn"
            style={{ width:'100%', justifyContent:'center', borderColor: color, color: color, fontSize:12, padding:'8px' }}
          >
            But
          </button>
          <button
            onClick={() => { if (navigator.vibrate) navigator.vibrate(20); onScoreChange(team, -1); }}
            className="o-btn o-btn--ghost"
            style={{ width:'100%', justifyContent:'center', fontSize:11, padding:'6px' }}
          >
            Annulé
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position:'relative', background:'var(--orion-surface)', border:'1px solid var(--orion-line)', borderRadius:18, padding:'22px 20px', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg, var(--orion-accent), #5BE3FF 55%, var(--orion-amber))' }} />
      <div style={{ display:'flex', alignItems:'stretch', gap:16 }}>
        <TeamSide team="A" logo={logoA} inputRef={inputARef} name={teamAName} score={teamAScore} color={teamAColor} />

        {/* Centre */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', gap:10, padding:'4px 0' }}>
          {/* Chrono — anneau de progression */}
          <div style={{ position:'relative', width:104, height:104, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="104" height="104" viewBox="0 0 104 104" style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
              <circle cx="52" cy="52" r="46" fill="none" stroke="var(--orion-line)" strokeWidth="5" />
              <circle cx="52" cy="52" r="46" fill="none" stroke={isRunning ? 'var(--orion-accent)' : 'var(--orion-text-mute)'} strokeWidth="5" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={ringOffset} />
            </svg>
            <span className="o-num" style={{ fontSize:24, fontWeight:700, color: isRunning ? 'var(--orion-text)' : 'var(--orion-text-mute)', lineHeight:1 }}>
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Séparateur */}
          <div style={{ width:'1px', flex:1, background:'var(--orion-line)' }} />

          {/* Contrôles */}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={onToggle} className="o-btn o-btn--sm"
              title={isRunning ? 'Pause (Espace)' : 'Démarrer (Espace)'}
              style={{ borderColor: isRunning ? 'var(--orion-red)' : 'var(--orion-accent)', color: isRunning ? 'var(--orion-red)' : 'var(--orion-accent)' }}>
              {isRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={onReset} className="o-btn o-btn--ghost o-btn--sm" title="Réinitialiser">
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Mi-temps */}
          {halftimes.length < 2 ? (
            <button onClick={onHalftime} className="o-btn o-btn--sm"
              style={{ fontSize:10, borderColor:'var(--orion-text-mute)', color:'var(--orion-text-dim)' }}>
              <Timer size={12} />
              {halftimes.length === 0 ? 'Mi-temps' : '2ème MT'}
            </button>
          ) : (
            <span className="o-eyebrow">{formatTime(halftimes[0])} / {formatTime(halftimes[1])}</span>
          )}

          {/* Coup d'envoi */}
          {onKickoff && (
            kickoffRealTime ? (
              <span className="o-num" style={{ fontSize:10, color:'var(--orion-amber)' }}>
                {kickoffRealTime.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </span>
            ) : (
              <button onClick={() => onKickoff(new Date())} className="o-btn o-btn--sm"
                style={{ borderColor:'var(--orion-amber)', color:'var(--orion-amber)', fontSize:10 }}>
                <Zap size={12} /> Coup d'envoi
              </button>
            )
          )}

          {/* Status */}
          <span className="o-eyebrow" style={{ color: isRunning ? 'var(--orion-red)' : 'var(--orion-text-mute)' }}>
            {isRunning ? '● EN DIRECT' : 'PAUSE'}
          </span>
        </div>

        <TeamSide team="B" logo={logoB} inputRef={inputBRef} name={teamBName} score={teamBScore} color="var(--orion-amber)" />
      </div>

      {/* Possession */}
      {onTogglePossession && (
        <div style={{ marginTop:14, borderTop:'1px solid var(--orion-line)', paddingTop:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span className="o-eyebrow">Possession</span>
            {possessionSeconds && (possessionSeconds.A + possessionSeconds.B) > 0 && (
              <span className="o-num" style={{ fontSize:11, color:'var(--orion-text-mute)' }}>
                {Math.round((possessionSeconds.A / (possessionSeconds.A + possessionSeconds.B)) * 100)}% — {Math.round((possessionSeconds.B / (possessionSeconds.A + possessionSeconds.B)) * 100)}%
              </span>
            )}
          </div>
          <div style={{ display:'flex', height:36, borderRadius:999, overflow:'hidden', border:'1px solid var(--orion-line)' }}>
            <button
              onClick={() => { if (navigator.vibrate) navigator.vibrate(15); onTogglePossession('A'); }}
              style={{
                width: possessionSeconds && (possessionSeconds.A + possessionSeconds.B) > 0
                  ? `${Math.max(Math.min((possessionSeconds.A / (possessionSeconds.A + possessionSeconds.B)) * 100, 80), 20)}%`
                  : '50%',
                background: possessionTeam === 'A' ? teamAColor : 'var(--orion-surface-2)',
                color: possessionTeam === 'A' ? '#0a0e14' : 'var(--orion-text-mute)',
                border:'none', cursor:'pointer', fontWeight:700, fontSize:12,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', padding:'0 8px',
                transition:'width .3s ease, background .15s ease',
              }}
            >
              {possessionTeam === 'A' && '●'} {teamAName}
            </button>
            <button
              onClick={() => { if (navigator.vibrate) navigator.vibrate(15); onTogglePossession('B'); }}
              style={{
                flex: 1,
                background: possessionTeam === 'B' ? 'var(--orion-amber)' : 'var(--orion-surface-2)',
                color: possessionTeam === 'B' ? '#0a0e14' : 'var(--orion-text-mute)',
                border:'none', cursor:'pointer', fontWeight:700, fontSize:12,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', padding:'0 8px',
                transition:'background .15s ease',
              }}
            >
              {possessionTeam === 'B' && '●'} {teamBName}
            </button>
          </div>
        </div>
      )}

      {/* Compos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:16, borderTop:'1px solid var(--orion-line)', paddingTop:14 }}>
        <button onClick={() => onOpenFormation('A')} className="o-btn o-btn--ghost o-btn--sm" style={{ justifyContent:'center', color: teamAColor }}>
          <Users size={12} /> {teamAName}
        </button>
        <button onClick={() => onOpenFormation('B')} className="o-btn o-btn--ghost o-btn--sm" style={{ justifyContent:'center', color:'var(--orion-amber)' }}>
          <Users size={12} /> {teamBName}
        </button>
      </div>
    </div>
  );
}
