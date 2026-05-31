/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
          DEFAULT: 'var(--accent)',
        },
      },
      borderRadius: {
        card: '1rem',
        input: '12px',
        button: '12px',
      },
      spacing: {
        sidebar: '256px',
        'sidebar-collapsed': '64px',
      },
      maxWidth: {
        'modal': '512px',
        'modal-lg': '896px',
      },
    },
  },
  plugins: [],
}
