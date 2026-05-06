// Orion — Tailwind preset
// Usage in tailwind.config.js:
//   const orionPreset = require('./handoff/orion-tailwind.preset');
//   module.exports = { presets: [orionPreset], content: [...] };

module.exports = {
  theme: {
    extend: {
      colors: {
        orion: {
          bg:        '#0b0d10',
          surface:   '#11141a',
          'surface-2': '#161a21',
          'surface-3': '#1d222b',
          line:      'rgba(255,255,255,0.07)',
          'line-strong': 'rgba(255,255,255,0.14)',
          text:      '#e8ecf2',
          'text-dim':   '#9aa3b2',
          'text-mute':  '#5b6472',
          'text-faint': '#363c47',
          accent:    '#5BE3FF',
          'accent-dim':  'rgba(91,227,255,0.15)',
          'accent-line': 'rgba(91,227,255,0.35)',
          green: '#7BE0A8',
          amber: '#FFD27A',
          red:   '#FF8A8A',
        },
      },
      fontFamily: {
        ui:      ['Geist', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'ui-monospace', 'monospace'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
      },
      letterSpacing: {
        eyebrow: '0.18em',
        label:   '0.14em',
        tight:   '-0.015em',
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',     // sharp by default
        sm: '2px',
      },
    },
  },
  plugins: [
    function ({ addUtilities, addBase }) {
      addBase({
        '@import': 'url("https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap")',
      });
      addUtilities({
        '.o-tabular': { 'font-variant-numeric': 'tabular-nums' },
        '.o-display': {
          fontFamily: 'Instrument Serif, Georgia, serif',
          fontStyle: 'italic',
          letterSpacing: '-0.015em',
          lineHeight: '1',
        },
      });
    },
  ],
};
