export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs sombres (zones codage live, sidebar)
        dark:              '#0d1117',
        'dark-secondary':  '#161c26',
        'dark-tertiary':   '#1e2736',
        'dark-card':       '#161c26',
        'orion-dark':      '#0d1117',
        // Accent
        'orange-primary':  '#3d80e0',
        'orion-accent':    '#3d80e0',
        // Ces couleurs sont remappées dynamiquement via index.css — valeurs fixes comme fallback uniquement
        'orion-text':      '#16202e',
        'orion-text-mute': '#7587a0',
        'orion-line':      '#e1e7f0',
        'orion-surface':   '#ffffff',
        'orion-surface-2': '#f4f7fb',
        'orion-green':     '#1FA85A',
        'orion-amber':     '#E8920C',
        'orion-red':       '#E03B2E',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '8px', sm: '6px', lg: '10px' },
    },
  },
  plugins: [],
};
