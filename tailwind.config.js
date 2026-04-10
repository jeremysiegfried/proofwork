/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pw: {
          bg: '#0c0c0a',
          card: '#1a1a17',
          border: '#2a2a25',
          green: '#22c55e',
          greenDark: '#052e16',
          amber: '#f59e0b',
          amberDark: '#422006',
          muted: '#6b6456',
          text1: '#fafaf5',
          text2: '#a8a090',
          text3: '#d4cfc5',
        }
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
