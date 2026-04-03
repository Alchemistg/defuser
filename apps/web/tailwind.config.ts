import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#0d1117',
        ember: '#ef4444',
        signal: '#f59e0b',
        steel: '#d4d4d8',
        mint: '#22c55e'
      },
      fontFamily: {
        display: ['Space Grotesk', 'Segoe UI', 'sans-serif'],
        body: ['IBM Plex Sans', 'Segoe UI', 'sans-serif']
      },
      boxShadow: {
        panel: '0 20px 80px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
} satisfies Config;
