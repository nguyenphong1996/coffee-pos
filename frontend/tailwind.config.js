/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        coffee: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#d6c0b4',
          400: '#bfa094',
          500: '#9a7B68',
          600: '#83614f',
          700: '#6d4f43',
          800: '#5c4138',
          900: '#43302b',
        },
      },
    },
  },
  plugins: [],
}
