export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#111118',
        'dark-secondary': '#18181f',
        'dark-tertiary': '#1f1f28',
        'dark-card': '#1a1a22',
        'orion-dark': '#111118',
        'orange-primary': '#f97316',
        'carbon': '#111118',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
};
