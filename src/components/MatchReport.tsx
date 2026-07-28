import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, TrendingUp, BarChart3, Users, Video, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, MatchEventWithDetails } from '../types/database';
import Statistics from './Statistics';
import MatchLineupFree from './MatchLineupFree';
import { calculateTeamXG, getShotEvents } from '../utils/xg';
import Timeline from './Timeline';
import ExportButton from './ExportButton';
import { Share2, Check, Copy } from 'lucide-react';
import VideoAnalysisTab from './VideoAnalysisTab';
import Heatmap from './Heatmap';
import MatchTags from './MatchTags';
import MatchLineupEditor from './MatchLineupEditor';
import PdfConfigModal from './PdfConfigModal';

interface MatchReportProps {
  matchId: string;
  onBack: () => void;
  readOnly?: boolean;
}

interface MatchWithEvents extends Match {
  events: MatchEventWithDetails[];
}

export default function MatchReport({ matchId, onBack, readOnly = false }: MatchReportProps) {
  const [match, setMatch] = useState<MatchWithEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamALogoUrl, setTeamALogoUrl] = useState<string | undefined>(undefined);
  const [teamBLogoUrl, setTeamBLogoUrl] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'overview' | 'video' | 'tags' | 'composition'>('overview');
  const [showPdfConfig, setShowPdfConfig] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = async () => {
    // Si un lien a déjà été copié dans cette session, on le réutilise
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      return;
    }
    setSharing(true);

    // Réutiliser le token déjà en base s'il existe (lien STABLE : ne casse jamais les liens déjà envoyés)
    let token = match?.share_token;

    if (!token) {
      // Aucun lien encore : on en génère un une seule fois
      token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const { error } = await supabase.from('matches').update({ share_token: token }).eq('id', matchId);
      if (error) { setSharing(false); return; }
    }

    const url = `${window.location.origin}/share/${token}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
    setSharing(false);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    loadMatchData();
  }, [matchId]);

  const loadMatchData = async () => {
    // Liste explicite des colonnes : on exclut volontairement video_url,
    // video_provider et video_share_id pour ne jamais les exposer dans un
    // rapport partagé public (ce composant sert aussi la vue /share/).
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select(`
        id, team_a_id, team_b_id, team_a_name, team_b_name,
        team_a_score, team_b_score,
        match_date, match_time, status, tag_competition, tag_venue,
        tag_stake, tag_surface, tag_weather, tag_notes, share_token,
        possession_a_seconds, possession_b_seconds
      `)
      .eq('id', matchId)
      .maybeSingle();

    if (matchError || !matchData) {
      console.error('Error loading match:', matchError);
      setLoading(false);
      return;
    }

    const { data: eventsData } = await supabase
      .from('match_events')
      .select(`
        *,
        event_type:event_types(*),
        player:players(*)
      `)
      .eq('match_id', matchId)
      .order('timestamp', { ascending: true });

    const teamAId = matchData.team_a_id;
    const teamBId = matchData.team_b_id;

    if (teamAId || teamBId) {
      const ids = [teamAId, teamBId].filter(Boolean) as string[];
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, logo_url')
        .in('id', ids);

      if (teamsData) {
        const teamAData = teamsData.find(t => t.id === teamAId);
        const teamBData = teamsData.find(t => t.id === teamBId);
        if (teamAData?.logo_url) setTeamALogoUrl(teamAData.logo_url);
        if (teamBData?.logo_url) setTeamBLogoUrl(teamBData.logo_url);
      }
    }

    setMatch({
      ...matchData,
      events: eventsData as MatchEventWithDetails[] || [],
    });
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateMatchStats = () => {
    if (!match) return null;

    const teamAEvents = match.events.filter(e => e.team === 'A');
    const teamBEvents = match.events.filter(e => e.team === 'B');

    const teamASuccess = teamAEvents.filter(e => e.outcome === 'success').length;
    const teamBSuccess = teamBEvents.filter(e => e.outcome === 'success').length;

    const shotsA = match.events.filter(e => e.team === 'A' && (e.event_type?.name === 'Tir' || e.label === 'Tir'));
    const shotsB = match.events.filter(e => e.team === 'B' && (e.event_type?.name === 'Tir' || e.label === 'Tir'));
    const onTargetA = shotsA.filter(e => e.outcome === 'success').length;
    const onTargetB = shotsB.filter(e => e.outcome === 'success').length;

    return {
      teamATotal: teamAEvents.length,
      teamBTotal: teamBEvents.length,
      teamASuccess,
      teamBSuccess,
      teamASuccessRate: teamAEvents.length > 0 ? (teamASuccess / teamAEvents.length * 100).toFixed(1) : '0',
      teamBSuccessRate: teamBEvents.length > 0 ? (teamBSuccess / teamBEvents.length * 100).toFixed(1) : '0',
      totalEvents: match.events.length,
      shotsA: shotsA.length,
      shotsB: shotsB.length,
      onTargetA,
      onTargetB,
    };
  };

  const handleMatchUpdate = (updatedMatch: MatchWithEvents) => {
    setMatch(updatedMatch);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-gray-400">Match non trouvé</div>
      </div>
    );
  }

  const stats = calculateMatchStats();

  return (
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', color:'var(--orion-text)', padding:'12px 16px' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <header style={{ marginBottom:16 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)', marginBottom:12, display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <ArrowLeft size={18} /> Retour
          </button>

          <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0d1117 0%, #16243a 100%)', borderRadius:14, padding:'26px 20px 22px', color:'#fff', boxShadow:'0 16px 40px -16px rgba(13,17,23,0.5)' }}>
            <div style={{ position:'absolute', top:0, right:0, width:340, height:'100%', background:'radial-gradient(circle at 80% 30%, rgba(61,128,224,0.25), transparent 60%)', pointerEvents:'none' }} />

            {/* Titre + boutons */}
            <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:18, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aa0bd' }}>
                {match.tag_competition || 'Match de football'}
              </span>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {!readOnly && (
                  <>
                    <button onClick={() => setShowPdfConfig(true)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 12px', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.18)', borderRadius:6, fontSize:11, fontWeight:600, color:'#dbe3ee', cursor:'pointer' }}>
                      📄 PDF
                    </button>
                    <button onClick={handleShare} disabled={sharing} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 12px', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.18)', borderRadius:6, fontSize:11, fontWeight:600, color: shareCopied ? '#5ee29a' : '#dbe3ee', cursor:'pointer' }}>
                      {shareCopied ? <><Check size={12} /> Copié</> : sharing ? '...' : <><Share2 size={12} /> Partager</>}
                    </button>
                    <ExportButton
                      events={match.events}
                      teamAName={match.team_a_name}
                      teamBName={match.team_b_name}
                      teamAColor={match.team_a_color || '#3D80E0'}
                      teamBColor={match.team_b_color || '#E8920C'}
                      matchDate={new Date(match.match_date).toLocaleDateString('fr-FR')}
                      scoreA={match.team_a_score}
                      scoreB={match.team_b_score}
                      duration={match.match_time}
                      teamALogoUrl={teamALogoUrl}
                      teamBLogoUrl={teamBLogoUrl}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Score avec logos */}
            <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{ width:'clamp(48px, 12vw, 72px)', height:'clamp(48px, 12vw, 72px)', borderRadius:16, background: `linear-gradient(135deg, ${match.team_a_color || '#3D80E0'}, ${match.team_a_color || '#2a63b8'})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(14px, 3vw, 22px)', fontWeight:900, letterSpacing:'0.02em', boxShadow:'0 8px 20px -6px rgba(61,128,224,0.5)' }}>
                  {match.team_a_name.slice(0,3).toUpperCase()}
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'clamp(12px, 2.5vw, 15px)', fontWeight:800 }}>{match.team_a_name}</div>
                  <div style={{ fontSize:10, color:'#8aa0bd', marginTop:2 }}>{match.tag_venue === 'away' ? 'Extérieur' : 'Domicile'}</div>
                </div>
              </div>

              <div style={{ textAlign:'center', padding:'0 4px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'clamp(6px, 2vw, 12px)' }}>
                  <span style={{ fontFamily:'var(--orion-font-mono)', fontSize:'clamp(34px, 9vw, 56px)', fontWeight:800, lineHeight:1 }}>{match.team_a_score}</span>
                  <span style={{ fontSize:'clamp(16px, 4vw, 24px)', fontWeight:300, color:'#5a6c85' }}>:</span>
                  <span style={{ fontFamily:'var(--orion-font-mono)', fontSize:'clamp(34px, 9vw, 56px)', fontWeight:800, lineHeight:1, color:'#c3cedd' }}>{match.team_b_score}</span>
                </div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:9, padding:'3px 10px', background: match.team_a_score > match.team_b_score ? 'rgba(31,168,90,0.18)' : match.team_a_score < match.team_b_score ? 'rgba(224,59,46,0.15)' : 'rgba(232,146,12,0.15)', border: `1px solid ${match.team_a_score > match.team_b_score ? 'rgba(31,168,90,0.5)' : match.team_a_score < match.team_b_score ? 'rgba(224,59,46,0.4)' : 'rgba(232,146,12,0.4)'}`, borderRadius:999, fontSize:10, fontWeight:700, color: match.team_a_score > match.team_b_score ? '#5ee29a' : match.team_a_score < match.team_b_score ? '#ff8a7a' : '#ffc15e', letterSpacing:'0.04em' }}>
                  {match.team_a_score > match.team_b_score ? 'VICTOIRE' : match.team_a_score < match.team_b_score ? 'DÉFAITE' : 'NUL'}
                </div>
                <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:9, color:'#6b7d96', marginTop:7 }}>
                  {new Date(match.match_date).toLocaleDateString('fr-FR')} · {formatDuration(match.match_time)}
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{ width:'clamp(48px, 12vw, 72px)', height:'clamp(48px, 12vw, 72px)', borderRadius:16, background: `linear-gradient(135deg, ${match.team_b_color || '#E8920C'}, ${match.team_b_color || '#c87908'})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(14px, 3vw, 22px)', fontWeight:900, letterSpacing:'0.02em', boxShadow:'0 8px 20px -6px rgba(232,146,12,0.45)' }}>
                  {match.team_b_name.slice(0,3).toUpperCase()}
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'clamp(12px, 2.5vw, 15px)', fontWeight:800 }}>{match.team_b_name}</div>
                  <div style={{ fontSize:10, color:'#8aa0bd', marginTop:2 }}>{match.tag_venue === 'away' ? 'Domicile' : 'Extérieur'}</div>
                </div>
              </div>
            </div>

            {/* Tags contextuels */}
            {(match.tag_competition || match.tag_venue || match.tag_stake || match.tag_surface || match.tag_weather || match.tag_notes) && (
              <div style={{ position:'relative', display:'flex', flexWrap:'wrap', gap:8, marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                {match.tag_competition && <span style={{ fontSize:11, color:'#dbe3ee' }}>🏆 {match.tag_competition}</span>}
                {match.tag_venue && <span style={{ fontSize:11, color:'#dbe3ee' }}>📍 {match.tag_venue === 'home' ? 'Domicile' : match.tag_venue === 'away' ? 'Extérieur' : 'Terrain neutre'}</span>}
                {match.tag_stake && <span style={{ fontSize:11, color:'#dbe3ee' }}>🎯 {match.tag_stake === 'decisive' ? 'Match décisif' : match.tag_stake === 'friendly' ? 'Amical' : 'Match normal'}</span>}
                {match.tag_surface && <span style={{ fontSize:11, color:'#dbe3ee' }}>🌱 {match.tag_surface === 'grass' ? 'Pelouse' : 'Synthétique'}</span>}
                {match.tag_weather && <span style={{ fontSize:11, color:'#dbe3ee' }}>{match.tag_weather === 'sun' ? '☀️' : match.tag_weather === 'rain' ? '🌧️' : match.tag_weather === 'wind' ? '💨' : '❄️'} {match.tag_weather === 'sun' ? 'Beau temps' : match.tag_weather === 'rain' ? 'Pluie' : match.tag_weather === 'wind' ? 'Vent' : 'Froid'}</span>}
                {match.tag_notes && <span style={{ fontSize:11, color:'#dbe3ee', fontStyle:'italic' }}>📝 {match.tag_notes}</span>}
              </div>
            )}
          </div>
        </header>

        {/* TABS */}
        <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid var(--orion-line-strong)', marginBottom:16, overflowX:'auto' }}>
          {[
            { id:'overview', label:'Aperçu du match' },
            ...(!readOnly ? [
              { id:'video', label:'Analyse Vidéo', icon:'🎬' },
              { id:'tags',  label:'Tags', dot: !!(match.tag_competition || match.tag_venue || match.tag_stake) },
            { id:'composition', label:'Composition' },
            ] : []),
          ].map(tab => (
            <button key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 18px', background:'none', border:'none', borderBottom: activeTab === tab.id ? '2px solid var(--orion-accent)' : '2px solid transparent', cursor:'pointer', fontSize:13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? 'var(--orion-text)' : 'var(--orion-text-mute)', whiteSpace:'nowrap', transition:'all .15s', marginBottom:-1.5 }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {tab.dot && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--orion-accent)', flexShrink:0 }} />}
            </button>
          ))}
        </div>
        {activeTab === 'overview' && (
          <>
            {stats && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:0, background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
                {[
                  { label: `Actions ${match.team_a_name}`, value: stats.teamATotal, sub: `${stats.teamASuccess} réussies · ${stats.teamASuccessRate}%`, color: 'var(--orion-accent)' },
                  { label: `Actions ${match.team_b_name}`, value: stats.teamBTotal, sub: `${stats.teamBSuccess} réussies · ${stats.teamBSuccessRate}%`, color: 'var(--orion-amber)' },
                  { label: 'Total codé', value: stats.totalEvents, sub: 'événements', color: 'var(--orion-green)' },
                  { label: 'Tirs cadrés', value: `${stats.onTargetA + stats.onTargetB}/${stats.shotsA + stats.shotsB}`, sub: (stats.shotsA + stats.shotsB) > 0 ? `${Math.round((stats.onTargetA + stats.onTargetB) / (stats.shotsA + stats.shotsB) * 100)}% de précision` : '—', color: 'var(--orion-text)' },
                ].map((k, i, arr) => (
                  <div key={i} style={{ padding:'16px 18px', borderRight: i < arr.length-1 ? '1px solid var(--orion-line)' : 'none' }}>
                    <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--orion-text-mute)', marginBottom:8 }}>{k.label}</div>
                    <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:26, fontWeight:800, lineHeight:1, color:k.color }}>{k.value}</div>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:5 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Possession + xG */}
            {(() => {
              const posA = match.possession_a_seconds || 0;
              const posB = match.possession_b_seconds || 0;
              const posTotal = posA + posB;
              const possPctA = posTotal > 0 ? Math.round((posA / posTotal) * 100) : 50;
              const possPctB = 100 - possPctA;
              const xgA = calculateTeamXG(match.events as any, 'A');
              const xgB = calculateTeamXG(match.events as any, 'B');
              const xgTotal = xgA + xgB;
              const xgPctA = xgTotal > 0 ? Math.round((xgA / xgTotal) * 100) : 50;

              if (posTotal === 0 && xgTotal === 0) return null;

              return (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:14, marginBottom:16 }}>
                  {posTotal > 0 && (
                    <div style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:10, padding:18 }}>
                      <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--orion-text-mute)', marginBottom:14, textAlign:'center' }}>Possession</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:22, fontWeight:800, color:'var(--orion-accent)' }}>{possPctA}%</div>
                          <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>{match.team_a_name}</div>
                        </div>
                        <div style={{ position:'relative', width:84, height:84, borderRadius:'50%', background:`conic-gradient(var(--orion-accent) 0% ${possPctA}%, var(--orion-amber) ${possPctA}% 100%)` }}>
                          <div style={{ position:'absolute', inset:12, background:'var(--orion-surface)', borderRadius:'50%' }} />
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:22, fontWeight:800, color:'var(--orion-amber)' }}>{possPctB}%</div>
                          <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:2 }}>{match.team_b_name}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {xgTotal > 0 && (
                    <div style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line)', borderRadius:10, padding:18, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                      <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--orion-text-mute)', marginBottom:16, textAlign:'center' }}>Expected Goals · xG</div>
                      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', alignItems:'center', gap:12 }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:24, fontWeight:800, color:'var(--orion-accent)', lineHeight:1 }}>{xgA.toFixed(2)}</div>
                          <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:4 }}>{stats?.shotsA || 0} tirs</div>
                        </div>
                        <div style={{ display:'flex', height:9, borderRadius:5, overflow:'hidden', background:'var(--orion-surface-3)' }}>
                          <div style={{ width:`${xgPctA}%`, background:'var(--orion-accent)' }} />
                          <div style={{ flex:1, background:'var(--orion-amber)' }} />
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontFamily:'var(--orion-font-mono)', fontSize:24, fontWeight:800, color:'var(--orion-amber)', lineHeight:1 }}>{xgB.toFixed(2)}</div>
                          <div style={{ fontSize:10, color:'var(--orion-text-mute)', marginTop:4 }}>{stats?.shotsB || 0} tirs</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-6">
              <Statistics
                events={match.events}
                teamAName={match.team_a_name}
                teamBName={match.team_b_name}
              />
              {match.events.some(e => e.field_x !== null && e.field_y !== null) && (
                <Heatmap
                  events={match.events}
                  teamAName={match.team_a_name}
                  teamBName={match.team_b_name}
                />
              )}
              <Timeline
                events={match.events}
                match={match}
                teamAName={match.team_a_name}
                teamBName={match.team_b_name}
              />
            </div>
          </>
        )}

        {activeTab === 'video' && (
          <VideoAnalysisTab
            match={{ ...match, events: match.events }}
            teamAName={match.team_a_name}
            teamBName={match.team_b_name}
          />
        )}

        {activeTab === 'composition' && (
          <MatchLineupFree
            matchId={match.id}
            teamAName={match.team_a_name}
            teamBName={match.team_b_name}
          />
        )}
        {activeTab === 'tags' && (
          <MatchTags
            matchId={matchId}
            match={match}
            onUpdate={(updated: any) => { setMatch((prev: any) => prev ? { ...prev, ...updated } : prev); }}
          />
        )}
      </div>

      {showPdfConfig && (
        <PdfConfigModal
          events={match.events}
          teamAName={match.team_a_name}
          teamBName={match.team_b_name}
          teamAColor={match.team_a_color || '#3D80E0'}
          teamBColor={match.team_b_color || '#E8920C'}
          matchDate={new Date(match.match_date).toLocaleDateString('fr-FR')}
          scoreA={match.team_a_score}
          scoreB={match.team_b_score}
          duration={match.match_time}
          teamALogoUrl={teamALogoUrl}
          teamBLogoUrl={teamBLogoUrl}
          onClose={() => setShowPdfConfig(false)}
        />
      )}
    </div>
  );
}
