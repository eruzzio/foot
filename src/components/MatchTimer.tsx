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
}

export default function MatchTimer({
  onTimeUpdate, isRunning, onToggle, onReset, currentTime,
  teamAName, teamBName, teamAScore, teamBScore, selectedTeam,
  onScoreChange, onSelectTeam, onOpenFormation,
  teamAColor = '#5BE3FF', teamALogoUrl = '',
  halftimes, onHalftime, kickoffRealTime, onKickoff,
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
          style={{ width:52, height:52, border:`1px solid ${isSelected ? color : 'var(--orion-line-strong)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', transition:'border-color .15s' }}
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
    <div style={{ background:'var(--orion-surface)', border:'1px solid var(--orion-line)', padding:'22px 20px' }}>
      <div style={{ display:'flex', alignItems:'stretch', gap:16 }}>
        <TeamSide team="A" logo={logoA} inputRef={inputARef} name={teamAName} score={teamAScore} color={teamAColor} />

        {/* Centre */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', gap:10, padding:'4px 0' }}>
          {/* Chrono */}
          <div className="o-num" style={{ fontSize:44, color: isRunning ? 'var(--orion-text)' : 'var(--orion-text-mute)', letterSpacing:'0.04em', lineHeight:1 }}>
            {formatTime(currentTime)}
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
