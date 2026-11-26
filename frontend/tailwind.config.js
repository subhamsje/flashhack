/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F7F7F2',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#246B5A',
          light: '#DDEBE4',
          dark: '#1A4F42',
        },
        accent: {
          DEFAULT: '#E4A75B',
        },
        text: '#26332F',
        muted: '#77827C',
        border: '#E2E5DF',
        received: '#38866C',
        missing: '#D99A54',
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
