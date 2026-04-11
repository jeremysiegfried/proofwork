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
          bg: '#FAF9F6',
          card: '#FFFFFF',
          border: '#E8E4DE',
          green: '#16A34A',
          greenDark: '#DCFCE7',
          greenText: '#166534',
          amber: '#D97706',
          amberDark: '#FEF3C7',
          amberText: '#92400E',
          muted: '#6B6560',
          text1: '#1A1A1A',
          text2: '#6B6560',
          text3: '#3D3832',
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
