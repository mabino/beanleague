/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          light: '#2d8a4e',
          dark: '#1e6837',
          line: 'rgba(255, 255, 255, 0.4)',
          border: 'rgba(255, 255, 255, 0.6)'
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        }
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.5s ease-in-out 2',
        'glow-green': 'glowGreen 1.5s ease-in-out infinite',
      },
      keyframes: {
        glowGreen: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(34, 197, 94, 0.6)' },
          '50%': { boxShadow: '0 0 30px rgba(34, 197, 94, 1)' },
        }
      }
    },
  },
  plugins: [],
}
