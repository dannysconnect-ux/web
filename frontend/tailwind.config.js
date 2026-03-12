/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glowingPurple: "#a855f7", // optional color names for clarity
        glowingIndigo: "#7c3aed",
      },
      boxShadow: {
        '2xl-glowing': '0 25px 50px -12px rgba(168, 85, 247, 0.5), 0 0 40px rgba(124, 58, 237, 0.8)',
        'glow-inner': 'inset 0 0 10px rgba(124, 58, 237, 0.6)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(128, 90, 213, 0.5), 0 0 40px rgba(124, 58, 237, 0.8)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(168, 85, 247, 1), 0 0 80px rgba(124, 58, 237, 1)',
            transform: 'scale(1.05)',
          },
        },
        glowText: {
          '0%, 100%': {
            textShadow: '0 0 10px rgba(168, 85, 247, 0.8)',
          },
          '50%': {
            textShadow: '0 0 20px rgba(124, 58, 237, 1)',
          },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        glowText: 'glowText 2.5s ease-in-out infinite',
      },
      scale: {
        102: '1.02',
        103: '1.03',
      },
    },
  },
  plugins: [],
}
