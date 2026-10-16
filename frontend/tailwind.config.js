/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F4F0',
        surface: '#FFFFFF',
        sunken: '#EEEDE8',
        line: '#E2E0D9',
        ink: { DEFAULT: '#14213D', soft: '#3D4A66', muted: '#5F6B82' },
        brand: { 50: '#E8F4F3', 100: '#CDE8E5', 500: '#13857A', 600: '#0F766E', 700: '#0B5E57', 800: '#094A45' },
        ok: { 50: '#ECF7EF', 600: '#1E7A3C', 700: '#17602F' },
        warn: { 50: '#FDF5E6', 600: '#A35F06', 700: '#82490A' },
        bad: { 50: '#FCEDEC', 600: '#B42318', 700: '#912018' },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['0.9375rem', { lineHeight: '1.45rem' }],
        lg: ['1.0625rem', { lineHeight: '1.55rem' }],
        xl: ['1.25rem', { lineHeight: '1.7rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      borderRadius: { DEFAULT: '6px', md: '6px', lg: '8px' },
      boxShadow: {
        card: '0 1px 2px rgba(20,33,61,0.06)',
        pop: '0 8px 24px rgba(20,33,61,0.14)',
      },
    },
  },
  plugins: [],
};
