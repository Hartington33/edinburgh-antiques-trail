/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'antique-gold': '#BFA058',
        'antique-cream': '#F5F5DC',
        'antique-brown': '#8B4513',
        'edinburgh-blue': '#1D3557',
        'edinburgh-stone': '#D6CFC7',
      },
    },
  },
  plugins: [],
}
