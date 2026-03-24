/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Paleta AntiGravity ──────────────────────────────
        background:   '#0D1117',
        surface:      '#161B22',
        elevated:     '#21262D',
        border:       '#30363D',

        primary:      '#3FB950',
        'primary-dim':'rgba(63,185,80,0.12)',

        'text-1':     '#E6EDF3',
        'text-2':     '#8B949E',
        'text-3':     '#6E7681',

        danger:       '#F85149',
        warning:      '#D29922',
        info:         '#388BFD',

        // ── Níveis SRS ──────────────────────────────────────
        'srs-0':      '#9CA3AF',
        'srs-1':      '#EF4444',
        'srs-2':      '#F97316',
        'srs-3':      '#FACC15',
        'srs-4':      '#3B82F6',
        'srs-5':      '#22C55E',
      },
      borderRadius: {
        card:   '12px',
        chip:   '20px',
        button: '10px',
      },
    },
  },
  plugins: [],
};
