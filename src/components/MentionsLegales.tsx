interface MentionsLegalesProps {
  onBack: () => void;
}

export default function MentionsLegales({ onBack }: MentionsLegalesProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--orion-bg)', color: 'var(--orion-text)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--orion-line)', color: 'var(--orion-text-dim)', padding: '8px 16px', cursor: 'pointer', marginBottom: 32, fontSize: 13 }}>
          ← Retour
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Mentions légales</h1>
        <p style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 40 }}>Dernière mise à jour : juin 2026</p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Éditeur du site</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            <strong style={{ color: 'var(--orion-text)' }}>Nom commercial :</strong> ORION — Sports Video Analytics & Coding<br />
            <strong style={{ color: 'var(--orion-text)' }}>Exploitant :</strong> Lucas Giovenco<br />
            <strong style={{ color: 'var(--orion-text)' }}>Adresse :</strong> Béziers, France<br />
            <strong style={{ color: 'var(--orion-text)' }}>Email :</strong> contact@orion-analyse.fr<br />
            <strong style={{ color: 'var(--orion-text)' }}>SIRET :</strong> [À compléter lors de l'immatriculation]<br />
            <strong style={{ color: 'var(--orion-text)' }}>Statut :</strong> Auto-entrepreneur
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hébergement</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            <strong style={{ color: 'var(--orion-text)' }}>Hébergeur front-end :</strong> Vercel Inc. — 340 Pine Street, Suite 701, San Francisco, CA 94104, USA<br />
            <strong style={{ color: 'var(--orion-text)' }}>Base de données :</strong> Supabase Inc. — 970 Toa Payoh North, Singapore<br />
            <strong style={{ color: 'var(--orion-text)' }}>Domaine :</strong> orion-analyse.fr (OVH SAS, 2 rue Kellermann, 59100 Roubaix, France)
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Propriété intellectuelle</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            L'ensemble du contenu de ce site (textes, graphiques, logotypes, icônes, images, interface) est la propriété exclusive de Lucas Giovenco / ORION et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, distribution ou utilisation sans autorisation préalable est interdite.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Limitation de responsabilité</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            ORION s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, ORION ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition. En conséquence, ORION décline toute responsabilité pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur ce site.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à l'adresse suivante : <strong style={{ color: 'var(--orion-accent)' }}>contact@orion-analyse.fr</strong>
          </p>
        </section>
      </div>
    </div>
  );
}
