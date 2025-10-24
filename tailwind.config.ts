import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // FAIB Primary Colors
        primary: {
          DEFAULT: '#235453',
          dark: '#1a3f3e',
          light: '#2d6a68',
        },
        // FAIB Secondary Colors
        secondary: {
          DEFAULT: '#90BEAB',
          light: '#a8cfbe',
        },
        navy: '#363765',
        // FAIB Tertiary Colors
        accent: {
          red: '#972A24',
          orange: '#DB9941',
          green: '#3F7933',
        },
        // Neutral Colors
        neutral: {
          grey: '#E6E6FA',
          black: '#252428',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
