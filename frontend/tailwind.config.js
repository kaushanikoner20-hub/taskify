/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6D28D9', // main brand purple
          dark: '#5B21B6',
          light: '#A78BFA',
          pale: '#EDE9FE',
        },
        surface: '#F9FAFB',
        ink: {
          DEFAULT: '#1F2937',
          muted: '#6B7280',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};