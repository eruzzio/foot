export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nouveau système bleu nuit
        dark:              '#0d1117',
        'dark-secondary':  '#161c26',
        'dark-tertiary':   '#1e2736',
        'dark-card':       '#161c26',
        'orion-dark':      '#0d1117',
        // Accent bleu UEFA
        'orange-primary':  '#3d80e0',
        'orion-accent':    '#3d80e0',
        'orion-text':      '#eef2f8',
        'orion-text-mute': '#7a92b0',
        'orion-line':      '#2a3a50',
        'orion-surface':   '#161c26',
        'orion-surface-2': '#1e2736',
        'orion-green':     '#2ecc71',
        'orion-amber':     '#f39c12',
        'orion-red':       '#e74c3c',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '6px', sm: '4px', lg: '8px' },
    },
  },
  plugins: [],
};
