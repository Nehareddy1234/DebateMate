/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                debate: {
                    bg: '#080c14',
                    panel: '#0d1424',
                    border: '#1e2d4a',
                    blue: '#38bdf8',
                    'blue-glow': '#0ea5e9',
                    green: '#4ade80',
                    'green-glow': '#16a34a',
                    gold: '#fbbf24',
                    muted: '#94a3b8',
                    surface: '#111827',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'glow-blue': '0 0 20px 4px rgba(56, 189, 248, 0.35)',
                'glow-green': '0 0 20px 4px rgba(74, 222, 128, 0.35)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-in-out forwards',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.35s ease-out forwards',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
                slideUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
            },
            backdropBlur: { xs: '2px' },
        },
    },
    plugins: [],
}
