/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#15803d',   // green-700
        'primary-dark': '#14532d', // green-900
        'primary-light': '#bbf7d0', // green-200
        secondary: '#2563eb',
        danger:    '#dc2626',
        warning:   '#f59e0b',
        success:   '#16a34a',
      },
      backgroundImage: {
        'gradient-green': 'linear-gradient(135deg, #16a34a 0%, #14532d 100%)',
        'gradient-green-soft': 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
      },
    },
  },
  plugins: [],
}
