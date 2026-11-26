/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0D1117',
        surface: '#161B22',
        primary: {
          DEFAULT: '#2EA043',
          light: '#3FB950',
          dark: '#238636',
        },
        accent: {
          DEFAULT: '#D29922',
        },
        text: '#F0F6FC',
        muted: '#8B949E',
        border: '#30363D',
        received: '#3FB950',
        missing: '#F0883E',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -3px rgba(46, 160, 67, 0.35)',
        'glow-accent': '0 0 20px -3px rgba(210, 153, 34, 0.35)',
      }
    },
  },
  plugins: [],
};
