/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 24px rgba(251, 146, 60, 0.35)'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.65', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' }
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 1.8s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
