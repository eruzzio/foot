import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log en production uniquement via console.error (non supprimé)
    console.error('ORION Error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', background:'#111118', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ maxWidth:420, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:16 }}>⚠️</div>
            <div style={{ fontSize:16, fontWeight:600, color:'#f0f0f2', marginBottom:8 }}>
              Une erreur est survenue
            </div>
            <div style={{ fontSize:13, color:'#6b6b7a', marginBottom:24 }}>
              {this.state.error?.message || 'Erreur inattendue dans ORION'}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button
                onClick={() => this.setState({ hasError: false })}
                style={{ padding:'10px 20px', background:'transparent', border:'1px solid #2a2a35', color:'#9090a0', borderRadius:6, cursor:'pointer', fontSize:13 }}
              >
                Réessayer
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ padding:'10px 20px', background:'#f97316', border:'none', color:'white', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600 }}
              >
                Recharger l'app
              </button>
            </div>
            <div style={{ fontSize:10, color:'#3a3a48', marginTop:20 }}>
              Si le problème persiste, vos données sont sauvegardées automatiquement.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
