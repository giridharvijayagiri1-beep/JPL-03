/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-background': 'var(--theme-background)',
        'theme-card': 'var(--theme-card)',
        'theme-primary': 'var(--theme-primary)',
        'theme-text': 'var(--theme-text)',
      }
    },
  },
  plugins: [],
}
