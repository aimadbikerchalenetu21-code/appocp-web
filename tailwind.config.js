/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1c3b72',
        secondary: '#2563eb',
        danger: '#dc2626',
        warning: '#f59e0b',
        success: '#16a34a',
      },
    },
  },
  plugins: [],
}
