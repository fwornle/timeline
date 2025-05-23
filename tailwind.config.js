import { colors } from './src/config/colors.js';

// Convert RGBA strings to hex for Tailwind compatibility
const rgbaToHex = (rgba) => {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return rgba;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: rgbaToHex(colors.primary[50]),
          100: rgbaToHex(colors.primary[100]),
          200: rgbaToHex(colors.primary[200]),
          300: rgbaToHex(colors.primary[300]),
          400: rgbaToHex(colors.primary[400]),
          500: rgbaToHex(colors.primary[500]),
          600: rgbaToHex(colors.primary[600]),
          700: rgbaToHex(colors.primary[700]),
          800: rgbaToHex(colors.primary[800]),
          900: rgbaToHex(colors.primary[900]),
        },
        accent: {
          50: rgbaToHex(colors.accent[50]),
          100: rgbaToHex(colors.accent[100]),
          200: rgbaToHex(colors.accent[200]),
          300: rgbaToHex(colors.accent[300]),
          400: rgbaToHex(colors.accent[400]),
          500: rgbaToHex(colors.accent[500]),
          600: rgbaToHex(colors.accent[600]),
          700: rgbaToHex(colors.accent[700]),
          800: rgbaToHex(colors.accent[800]),
          900: rgbaToHex(colors.accent[900]),
        },
        surface: {
          light: rgbaToHex(colors.surface.light),
          dark: rgbaToHex(colors.surface.dark),
          elevated: {
            light: rgbaToHex(colors.surface.elevated.light),
            dark: rgbaToHex(colors.surface.elevated.dark),
          }
        },
        success: rgbaToHex(colors.success),
        warning: rgbaToHex(colors.warning),
        error: rgbaToHex(colors.error),
      },
      boxShadow: {
        'professional': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'professional-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'professional-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'professional': '6px',
      }
    },
  },
  plugins: [],
}