import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, TrendingUp, BarChart3, Users, Video, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Match, MatchEventWithDetails } from '../types/database';
import Statistics from './Statistics';
import Timeline from './Timeline';
import ExportButton from './ExportButton';
import VideoAnalysisTab from './VideoAnalysisTab';
import Heatmap from './Heatmap';
import MatchTags from './MatchTags';
import PdfConfigModal from './PdfConfigModal';

interface MatchReportProps {
  matchId: string;
  onBack: () => void;
}

interface MatchWithEvents extends Match {
  events: MatchEventWithDetails[];
}

export default function MatchReport({ matchId, onBack }: MatchReportProps) {
  const [match, setMatch] = useState<MatchWithEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamALogoUrl, setTeamALogoUrl] = useState<string | undefined>(undefined);
  const [teamBLogoUrl, setTeamBLogoUrl] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'overview' | 'video' | 'tags'>('overview');
  const [showPdfConfig, setShowPdfConfig] = useState(false);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    loadMatchData();
  }, [matchId]);

  const loadMatchData = async () => {
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('*')
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

    return {
      teamATotal: teamAEvents.length,
      teamBTotal: teamBEvents.length,
      teamASuccess,
      teamBSuccess,
      teamASuccessRate: teamAEvents.length > 0 ? (teamASuccess / teamAEvents.length * 100).toFixed(1) : '0',
      teamBSuccessRate: teamBEvents.length > 0 ? (teamBSuccess / teamBEvents.length * 100).toFixed(1) : '0',
      totalEvents: match.events.length,
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
    <div style={{ minHeight:'100vh', background:'var(--orion-bg)', color:'var(--orion-text)', padding:'16px' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <header style={{ marginBottom:16 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--orion-text-mute)', marginBottom:12, display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
            <ArrowLeft size={18} /> Retour
          </button>

          <div style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, padding:'20px 20px 16px', overflow:'hidden' }}>
            {/* Titre + boutons */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16, flexWrap:'wrap' }}>
              <div>
                <p style={{ fontSize:10, color:'var(--orion-text-mute)', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:'var(--orion-font-mono)', marginBottom:6 }}>Match de football</p>
                <h1 style={{ fontSize:'clamp(18px, 4vw, 28px)', fontWeight:800, color:'var(--orion-text)', lineHeight:1.1 }}>
                  {match.team_a_name} <span style={{ color:'var(--orion-accent)' }}>vs</span> {match.team_b_name}
                </h1>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', flexShrink:0 }}>
                <button onClick={() => setShowPdfConfig(true)} className="o-btn o-btn--sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
                  📄 Rapport PDF
                </button>
                <ExportButton
                  events={match.events}
                  teamAName={match.team_a_name}
                  teamBName={match.team_b_name}
                  teamAColor={match.team_a_color || '#22c55e'}
                  teamBColor={match.team_b_color || '#f97316'}
                  matchDate={new Date(match.match_date).toLocaleDateString('fr-FR')}
                  scoreA={match.team_a_score}
                  scoreB={match.team_b_score}
                  duration={match.match_time}
                  teamALogoUrl={teamALogoUrl}
                  teamBLogoUrl={teamBLogoUrl}
                />
              </div>
            </div>

            {/* Score */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:8, alignItems:'center', marginBottom:16 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'clamp(36px, 8vw, 56px)', fontWeight:800, lineHeight:1, color:'var(--orion-text)', fontFamily:'var(--orion-font-mono)' }}>{match.team_a_score}</div>
                <p style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>Buts</p>
              </div>
              <div style={{ textAlign:'center', padding:'0 8px' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--orion-text-mute)' }}>
                      <Calendar size={13} />
                      {new Date(match.match_date).toLocaleDateString('fr-FR')}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--orion-text-mute)' }}>
                      <Clock size={13} />
                      {formatDuration(match.match_time)}
                    </div>
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--orion-text-mute)' }}>—</div>
                </div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'clamp(36px, 8vw, 56px)', fontWeight:800, lineHeight:1, color:'var(--orion-text)', fontFamily:'var(--orion-font-mono)' }}>{match.team_b_score}</div>
                <p style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>Buts</p>
              </div>
            </div>

            {/* Tags contextuels */}
            {(match.tag_competition || match.tag_venue || match.tag_stake || match.tag_surface || match.tag_weather) && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, paddingTop:12, borderTop:'1px solid var(--orion-line)' }}>
                {match.tag_competition && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'rgba(61,128,224,0.12)', border:'1px solid rgba(61,128,224,0.3)', borderRadius:4, fontSize:11, fontWeight:600, color:'#7ab4f0', fontFamily:'var(--orion-font-mono)' }}>
                    🏆 {match.tag_competition}
                  </span>
                )}
                {match.tag_venue && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, fontSize:11, fontWeight:600, color:'#a0b4cc', fontFamily:'var(--orion-font-mono)' }}>
                    📍 {match.tag_venue === 'home' ? 'Domicile' : match.tag_venue === 'away' ? 'Extérieur' : 'Terrain neutre'}
                  </span>
                )}
                {match.tag_stake && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'rgba(243,156,18,0.1)', border:'1px solid rgba(243,156,18,0.3)', borderRadius:4, fontSize:11, fontWeight:600, color:'#f39c12', fontFamily:'var(--orion-font-mono)' }}>
                    🎯 {match.tag_stake === 'decisive' ? 'Match décisif' : match.tag_stake === 'friendly' ? 'Amical' : 'Match normal'}
                  </span>
                )}
                {match.tag_surface && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'rgba(46,204,113,0.08)', border:'1px solid rgba(46,204,113,0.25)', borderRadius:4, fontSize:11, fontWeight:600, color:'#2ecc71', fontFamily:'var(--orion-font-mono)' }}>
                    🌱 {match.tag_surface === 'grass' ? 'Pelouse' : 'Synthétique'}
                  </span>
                )}
                {match.tag_weather && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, fontSize:11, fontWeight:600, color:'#a0b4cc', fontFamily:'var(--orion-font-mono)' }}>
                    {match.tag_weather === 'sun' ? '☀️' : match.tag_weather === 'rain' ? '🌧️' : match.tag_weather === 'wind' ? '💨' : '❄️'} {match.tag_weather === 'sun' ? 'Beau temps' : match.tag_weather === 'rain' ? 'Pluie' : match.tag_weather === 'wind' ? 'Vent' : 'Froid'}
                  </span>
                )}
                {match.tag_notes && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:4, fontSize:11, color:'#a0b4cc', fontFamily:'var(--orion-font-mono)', fontStyle:'italic', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    📝 {match.tag_notes}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* TABS */}
        <div style={{ display:'flex', gap:0, borderBottom:'1.5px solid var(--orion-line-strong)', marginBottom:16, overflowX:'auto' }}>
          {[
            { id:'overview', label:'Aperçu du match' },
            { id:'video',    label:'Analyse Vidéo', icon:'🎬' },
            { id:'tags',     label:'Tags', dot: !!(match.tag_competition || match.tag_venue || match.tag_stake) },
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
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:8, marginBottom:20 }}>
                {[
                  { label: match.team_a_name, value: stats.teamATotal, sub: `${stats.teamASuccess} réussies (${stats.teamASuccessRate}%)`, color: 'var(--orion-accent)' },
                  { label: match.team_b_name, value: stats.teamBTotal, sub: `${stats.teamBSuccess} réussies (${stats.teamBSuccessRate}%)`, color: 'var(--orion-amber)' },
                  { label: 'Total', value: stats.totalEvents, sub: 'événements codés', color: 'var(--orion-green)' },
                ].map((k, i) => (
                  <div key={i} style={{ background:'var(--orion-surface)', border:'1.5px solid var(--orion-line-strong)', borderRadius:6, padding:'16px 18px' }}>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', fontWeight:600, marginBottom:8 }}>{k.label}</div>
                    <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1, fontFamily:'var(--orion-font-mono)' }}>{k.value}</div>
                    <div style={{ fontSize:11, color:'var(--orion-text-mute)', marginTop:4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            )}

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
          teamAColor={match.team_a_color || '#22c55e'}
          teamBColor={match.team_b_color || '#f97316'}
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
