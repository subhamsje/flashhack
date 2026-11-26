/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F5F3ED',
        surface: '#FFFFFF',
        'surface-muted': '#EAE8DF',
        ink: '#202B29',
        'ink-muted': '#68746F',
        primary: {
          DEFAULT: '#176B5B',
          dark: '#104C42',
          light: '#238975',
        },
        accent: {
          DEFAULT: '#E3A45B',
          secondary: '#D16F51',
        },
        success: '#3F876C',
        warning: '#D99A45',
        danger: '#C75D50',
        border: '#DCDDD4',
        dark: {
          background: '#172421',
          surface: '#21312D',
          border: '#3C514A',
          text: '#F2F1E9',
          muted: '#8A9E97',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
