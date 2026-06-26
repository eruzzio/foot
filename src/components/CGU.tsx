interface CGUProps {
  onBack: () => void;
}

export default function CGU({ onBack }: CGUProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--orion-bg)', color: 'var(--orion-text)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--orion-line)', color: 'var(--orion-text-dim)', padding: '8px 16px', cursor: 'pointer', marginBottom: 32, fontSize: 13 }}>
          ← Retour
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Conditions Générales d'Utilisation</h1>
        <p style={{ fontSize: 12, color: 'var(--orion-text-mute)', marginBottom: 40 }}>Dernière mise à jour : juin 2026</p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Objet</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions dans lesquelles Lucas Giovenco, exploitant la plateforme ORION (ci-après "ORION"), met à disposition des utilisateurs le service accessible à l'adresse <strong style={{ color: 'var(--orion-text)' }}>orion-analyse.fr</strong>.<br /><br />
            ORION est une application web de codage et d'analyse vidéo dédiée aux entraîneurs et analystes de football amateur.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Accès au service</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            L'accès à ORION nécessite la création d'un compte utilisateur. L'utilisateur s'engage à fournir des informations exactes lors de son inscription et à maintenir ces informations à jour.<br /><br />
            ORION propose une période d'essai gratuite suivie d'un abonnement payant. Les conditions tarifaires sont disponibles sur la page dédiée du site.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Abonnement et paiement</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            L'abonnement ORION Pro est facturé mensuellement via Stripe, prestataire de paiement sécurisé. L'utilisateur peut résilier son abonnement à tout moment depuis son espace profil.<br /><br />
            En cas de résiliation, l'accès aux fonctionnalités Pro reste actif jusqu'à la fin de la période en cours. Aucun remboursement partiel ne sera effectué sauf disposition légale contraire.<br /><br />
            Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation de 14 jours ne s'applique pas aux services numériques dont l'exécution a commencé avec l'accord exprès de l'utilisateur.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Utilisation du service</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            L'utilisateur s'engage à utiliser ORION conformément aux présentes CGU et à la législation en vigueur. Il est notamment interdit de :<br /><br />
            — Partager ses identifiants de connexion avec des tiers<br />
            — Tenter de contourner les mesures de sécurité de la plateforme<br />
            — Utiliser le service à des fins illégales ou frauduleuses<br />
            — Publier des contenus portant atteinte aux droits de tiers
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>5. Données utilisateur</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Les données saisies par l'utilisateur (matchs, événements, statistiques, compositions) restent sa propriété. ORION ne revendique aucun droit sur ces données et s'engage à ne pas les partager avec des tiers sans consentement explicite.<br /><br />
            L'utilisateur peut demander la suppression de son compte et de l'ensemble de ses données en contactant contact@orion-analyse.fr.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>6. Disponibilité du service</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            ORION s'efforce d'assurer la disponibilité du service 24h/24 et 7j/7. Toutefois, des interruptions pour maintenance ou pour des raisons techniques peuvent survenir. ORION ne saurait être tenu responsable des dommages résultant d'une indisponibilité temporaire du service.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>7. Modification des CGU</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            ORION se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par email. La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles CGU.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>8. Droit applicable</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut, les tribunaux compétents seront ceux du ressort de Montpellier.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--orion-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>9. Contact</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--orion-text-dim)' }}>
            Pour toute question relative aux présentes CGU : <strong style={{ color: 'var(--orion-accent)' }}>contact@orion-analyse.fr</strong>
          </p>
        </section>
      </div>
    </div>
  );
}
