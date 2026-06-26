interface PolitiqueConfidentialiteProps {
  onBack: () => void;
}

export default function PolitiqueConfidentialite({ onBack }: PolitiqueConfidentialiteProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--orion-bg)', color: 'var(--orion-text)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--orion-line)', color: 'var(--orion-text-dim)', padding: '8px 16px', cursor: 'pointer', marginBottom: 32, fontSize: 13 }}>
          ← Retour
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Politique de confidentialité</h1>
        <p style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 40 }}>Dernière mise à jour : juin 2026</p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Responsable du traitement</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Le responsable du traitement des données personnelles est :<br /><br />
            <strong style={{ color: 'var(--orion-text)' }}>Lucas Giovenco</strong> — ORION Sports Analytics<br />
            Béziers, France<br />
            contact@orion-analyse.fr
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Données collectées</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Dans le cadre de l'utilisation d'ORION, nous collectons les données suivantes :<br /><br />
            <strong style={{ color: 'var(--orion-text)' }}>Données d'identification :</strong> prénom, nom, adresse email<br />
            <strong style={{ color: 'var(--orion-text)' }}>Données d'utilisation :</strong> matchs codés, événements, statistiques, compositions d'équipe<br />
            <strong style={{ color: 'var(--orion-text)' }}>Données de paiement :</strong> traitées exclusivement par Stripe — ORION ne stocke aucune donnée bancaire<br />
            <strong style={{ color: 'var(--orion-text)' }}>Données techniques :</strong> adresse IP, navigateur, date et heure de connexion
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Finalités du traitement</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Vos données sont collectées pour les finalités suivantes :<br /><br />
            — Gestion de votre compte et authentification<br />
            — Fourniture du service ORION (codage live, statistiques, rapports)<br />
            — Gestion des abonnements et facturation<br />
            — Envoi d'emails transactionnels (confirmation d'inscription, notifications)<br />
            — Amélioration du service et support utilisateur
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Base légale</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Le traitement de vos données est fondé sur :<br /><br />
            — L'exécution du contrat (fourniture du service)<br />
            — Votre consentement (emails marketing, si applicable)<br />
            — L'intérêt légitime d'ORION (amélioration du service, sécurité)
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>5. Conservation des données</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Vos données sont conservées pendant toute la durée de votre compte actif, puis supprimées dans un délai de 30 jours suivant la clôture de votre compte, sauf obligation légale de conservation plus longue (données de facturation : 10 ans).
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>6. Partage des données</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            ORION ne vend ni ne loue vos données personnelles à des tiers. Vos données peuvent être partagées avec les sous-traitants suivants dans le cadre strict de la fourniture du service :<br /><br />
            — <strong style={{ color: 'var(--orion-text)' }}>Supabase</strong> (hébergement base de données) — Singapore<br />
            — <strong style={{ color: 'var(--orion-text)' }}>Vercel</strong> (hébergement application) — USA<br />
            — <strong style={{ color: 'var(--orion-text)' }}>Stripe</strong> (paiement) — USA<br />
            — <strong style={{ color: 'var(--orion-text)' }}>Resend</strong> (emails transactionnels) — USA<br /><br />
            Ces prestataires sont soumis à des obligations de confidentialité strictes et ne peuvent utiliser vos données qu'aux fins pour lesquelles elles leur ont été transmises.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>7. Vos droits</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Conformément au RGPD, vous disposez des droits suivants :<br /><br />
            — <strong style={{ color: 'var(--orion-text)' }}>Droit d'accès</strong> : obtenir une copie de vos données<br />
            — <strong style={{ color: 'var(--orion-text)' }}>Droit de rectification</strong> : corriger des données inexactes<br />
            — <strong style={{ color: 'var(--orion-text)' }}>Droit à l'effacement</strong> : demander la suppression de vos données<br />
            — <strong style={{ color: 'var(--orion-text)' }}>Droit à la portabilité</strong> : recevoir vos données dans un format structuré<br />
            — <strong style={{ color: 'var(--orion-text)' }}>Droit d'opposition</strong> : vous opposer à certains traitements<br /><br />
            Pour exercer ces droits, contactez-nous à : <strong style={{ color: 'var(--orion-accent)' }}>contact@orion-analyse.fr</strong><br /><br />
            Vous avez également le droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>8. Cookies</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            ORION utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service (session d'authentification). Aucun cookie de tracking ou publicitaire n'est utilisé.
          </p>
        </section>
      </div>
    </div>
  );
}
