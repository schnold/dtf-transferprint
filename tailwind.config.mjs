/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        '7xl-extended': '101.2rem', // 26.5% larger than max-w-7xl (80rem * 1.15 * 1.10 = 101.2rem)
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        custom: {
          "primary": "var(--color-primary)",
          "primary-focus": "var(--color-primary-dark)",
          "primary-content": "#FFFFFF",

          "secondary": "var(--color-secondary)",
          "secondary-focus": "var(--color-secondary-dark)",
          "secondary-content": "#FFFFFF",

          "accent": "var(--color-accent)",
          "accent-focus": "var(--color-accent-dark)",
          "accent-content": "#FFFFFF",

          "neutral": "var(--color-neutral)",
          "neutral-focus": "var(--color-neutral-light)",
          "neutral-content": "#FFFFFF",

          "base-100": "var(--color-base-100)",
          "base-200": "var(--color-base-200)",
          "base-300": "var(--color-base-300)",
          "base-content": "var(--color-neutral)",

          "info": "var(--color-info)",
          "info-content": "#FFFFFF",

          "success": "var(--color-success)",
          "success-content": "#FFFFFF",

          "warning": "var(--color-warning)",
          "warning-content": "#FFFFFF",

          "error": "var(--color-error)",
          "error-content": "#FFFFFF",
        },
      },
      "light", // Keep light theme as fallback
    ],
  },
};

