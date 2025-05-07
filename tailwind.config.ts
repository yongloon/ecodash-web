import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"], // Enable dark mode using class strategy
  content: [
    "./pages/**/*.{ts,tsx}", // If using pages directory
    "./components/**/*.{ts,tsx}", // Include components directory
    "./app/**/*.{ts,tsx}", // Include app directory
    "./src/**/*.{ts,tsx}", // Include src directory
  ],
  prefix: "", // No prefix for utility classes
  theme: {
    container: { // Optional: container settings if using Shadcn
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: { // Optional: extend colors if using Shadcn or custom theme
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Add custom colors if needed
        indigo: { // Example custom color addition
           '50': '#eef2ff',
           '100': '#e0e7ff',
           '200': '#c7d2fe',
           '300': '#a5b4fc',
           '400': '#818cf8',
           '500': '#6366f1',
           '600': '#4f46e5',
           '700': '#4338ca',
           '800': '#3730a3',
           '900': '#312e81',
           '950': '#1e1b4b',
        },
      },
      borderRadius: { // Optional: extend border radius if using Shadcn
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: { // Optional: keyframes if using Shadcn animations
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: { // Optional: animations if using Shadcn
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: { // Define font families
        sans: ['Inter', 'sans-serif'], // Example using Inter
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // Optional: plugin if using Shadcn animations
};

export default config;
