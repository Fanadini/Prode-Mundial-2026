import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: { 300: '#E8D5A3', 400: '#D4A843', 500: '#C8952A', 600: '#A97820' },
        pitch: { 950: '#080A0C', 900: '#0F1215', 800: '#181D22', 700: '#222830', 600: '#2E3740' },
      },
    },
  },
  plugins: [],
}
export default config
