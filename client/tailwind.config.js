/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cart: {
          ink: '#15291f',
          green: '#16834a',
          forest: '#0d6336',
          lime: '#d9f56b',
          canvas: '#f5f8f4',
        },
      },
      boxShadow: {
        card: '0 10px 35px rgba(24,59,38,.07)',
      },
      borderRadius: {
        card: '22px',
      },
    },
  },
  plugins: [],
};
