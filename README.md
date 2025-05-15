# EcoDash - Economic Indicators Dashboard

A comprehensive, visually engaging dashboard for tracking and comparing key national economic indicators, built with Next.js, TypeScript, Tailwind CSS, Recharts, and NextAuth.js for user management and subscriptions.

**Live Demo:** [Link to deployed demo (if available)]

## Features

*   **Comprehensive Indicators:** Tracks 33+ key economic indicators across 8 categories (using real FRED data for configured US indicators, AlphaVantage for PMI/NMI, CoinGecko for Crypto, Alternative.me for Fear & Greed, otherwise mock data placeholders).
*   **User Authentication:** Secure login via Email/Password and Google OAuth, powered by NextAuth.js. Supports a demo mode with pre-defined users if no database is connected.
*   **Subscription Tiers:** Free, Basic, and Pro plans with feature gating, integrated with Stripe for checkout and subscription management.
*   **User Profiles:** Users can view their profile and manage their subscription via Stripe's customer portal.
*   **Password Management:** Secure password change functionality for credential-based accounts and a "forgot password" email reset flow.
*   **Favorite Indicators:** Logged-in users (Basic/Pro tiers) can mark, view, and manage a list of their favorite indicators.
*   **Visualizations:** Historical trends displayed using interactive Line, Bar, and Area charts (via Recharts), including recession shading.
*   **Moving Averages:** Display common moving averages on charts (Basic/Pro feature).
*   **Latest Data & Trends:** Shows the most recent value, date, unit, and basic trend comparison for each indicator.
*   **Detailed Information:** Includes descriptions and source citations for transparency.
*   **Categorized View:** Indicators organized into logical sections accessible via a responsive sidebar.
*   **Overview Dashboard:** Summary cards highlight headline metrics and user favorites.
*   **Widgetized Content:** Overview page includes Market Snapshot, News Feed (NewsAPI.org), Economic Calendar, and Earnings Calendar (Finnhub.io).
*   **Country Selection:** UI for country selection (US default). Primarily affects US data for real API fetching; other countries currently use mock data.
*   **Light/Dark Mode:** User-selectable theme preference with a toggle.
*   **Contact Form:** Allows users to send inquiries.
*   **Modern Tech Stack:** Next.js 14+ App Router, TypeScript, Server Components, Tailwind CSS.

## Screenshots

*(Add updated screenshots of the dashboard overview, category pages, profile, and pricing page here)*

![Overview Page Screenshot](placeholder-overview.png)
![Category Page Screenshot](placeholder-category.png)
![Pricing Page Screenshot](placeholder-pricing.png)
![Profile Page Screenshot](placeholder-profile.png)

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Authentication:** [NextAuth.js](https://next-auth.js.org/) (Credentials, Google providers)
*   **Database ORM:** [Prisma](https://www.prisma.io/) (with `@auth/prisma-adapter`)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** [Shadcn/ui](https://ui.shadcn.com/) (Card, Tooltip, Select, Button, Avatar, Input, Label, Separator, Switch, Textarea, Popover, Calendar, Badge)
*   **Charting:** [Recharts](https://recharts.org/)
*   **Data Fetching (Client):** [SWR](https://swr.vercel.app/) (for favorites)
*   **Data Fetching (Server):** Next.js Server Components, `fetch` API
*   **Payment Processing:** [Stripe](https://stripe.com/) (`@stripe/react-stripe-js`, `@stripe/stripe-js`)
*   **Emailing:** [Resend](https://resend.com/), [@react-email/components](https://react.email/)
*   **Icons:** [React Icons](https://react-icons.github.io/react-icons/), [Lucide React](https://lucide.dev/)
*   **Date Formatting:** [date-fns](https://date-fns.org/)
*   **Password Hashing:** [bcrypt](https://www.npmjs.com/package/bcrypt)
*   **Validation:** [Zod](https://zod.dev/) (for API input validation)
*   **Class Merging:** `clsx`, `tailwind-merge`
*   **Statistical Calculations:** `simple-statistics`

## Project Structure
ecodash-web/
├── prisma/
│ └── schema.prisma # Prisma schema for database models
├── src/
│ ├── app/ # Next.js App Router
│ │ ├── (dashboard)/ # Dashboard route group (overview, category)
│ │ │ ├── category/[slug]/page.tsx
│ │ │ ├── layout.tsx
│ │ │ └── page.tsx
│ │ ├── account/profile/page.tsx # User profile
│ │ ├── api/ # API Routes
│ │ │ ├── auth/[...nextauth]/route.ts
│ │ │ ├── register/route.ts
│ │ │ ├── stripe/ # Stripe webhooks, checkout, portal
│ │ │ └── users/favorites/route.ts
│ │ ├── contact/page.tsx
│ │ ├── favorites/page.tsx
│ │ ├── forgot-password/page.tsx
│ │ ├── login/page.tsx
│ │ ├── pricing/page.tsx
│ │ ├── pro/comparison/page.tsx # Placeholder for Pro feature
│ │ ├── register/page.tsx
│ │ ├── reset-password/page.tsx
│ │ ├── subscribe/success/page.tsx
│ │ ├── globals.css
│ │ └── layout.tsx # Root layout
│ ├── components/
│ │ ├── dashboard/ # Dashboard specific components (Header, Sidebar, Cards, Charts)
│ │ ├── ui/ # Reusable UI elements from Shadcn/ui
│ │ ├── ContactForm.tsx
│ │ └── SubscriptionButton.tsx
│ ├── context/
│ │ └── NextAuthProvider.tsx # SessionProvider wrapper
│ ├── emails/ # React Email templates
│ │ ├── PasswordResetEmail.tsx
│ │ └── WelcomeSubscriberEmail.tsx
│ ├── hooks/
│ │ └── useFavorites.ts
│ ├── lib/
│ │ ├── api.ts # API fetching logic for external services
│ │ ├── calculations.ts # Data transformation functions
│ │ ├── indicators.ts # Indicator definitions & metadata
│ │ ├── mockData.ts # Mock data generation & main data fetch orchestrator
│ │ ├── prisma.ts # Prisma client instance
│ │ ├── recessionData.ts # Recession period data
│ │ ├── stripe.ts # Stripe client instance
│ │ └── utils.ts # Utility functions (cn)
├── .env.local.example # Example environment variables
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md

## Getting Started

### Prerequisites

*   Node.js (v18.17 or later recommended)
*   npm, yarn, or pnpm
*   A PostgreSQL database (or other Prisma-compatible DB) if not running in demo-only mode.
*   API keys for FRED, Alpha Vantage, NewsAPI.org, Finnhub, Resend, Google OAuth, and Stripe.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/ecodash-web.git](https://github.com/your-username/ecodash-web.git)
    cd ecodash-web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or: yarn install / pnpm install
    ```

3.  **Setup Shadcn/ui (if not already matching project):**
    This project heavily utilizes Shadcn/ui. If you need to re-initialize or add components:
    ```bash
    npx shadcn-ui@latest init
    # Follow prompts (e.g., New York style, Slate color, use CSS variables).
    # Add components used if missing (e.g., card, button, input, select, tooltip, avatar, etc.)
    # npx shadcn-ui@latest add card button input ...
    ```

4.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of the project by copying `.env.local.example` (you'll need to create this example file). Add your API keys and configuration:

    ```env
    # .env.local

    # General App
    NEXT_PUBLIC_APP_URL=http://localhost:3000 # Your app's deployment URL

    # Database (REQUIRED for full features like user accounts, subscriptions, saved favorites)
    # If not set, auth will use hardcoded demo users and some features will be disabled or mocked.
    DATABASE_URL="postgresql://user:password@host:port/database?sslmode=prefer"

    # NextAuth
    NEXTAUTH_URL=http://localhost:3000 # Must match NEXT_PUBLIC_APP_URL in dev
    NEXTAUTH_SECRET= # Generate a strong secret: `openssl rand -base64 32`
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

    # Economic Data APIs
    FRED_API_KEY=
    ALPHA_VANTAGE_API_KEY=
    NEWSAPI_ORG_KEY=
    FINNHUB_API_KEY=
    # COINGECKO_API_KEY= (Optional, current implementation uses public endpoints)

    # Email (Resend)
    RESEND_API_KEY=
    EMAIL_FROM_ADDRESS="EcoDash <you@yourdomain.com>" # Your verified Resend sending address

    # Stripe (REQUIRED for subscriptions)
    STRIPE_SECRET_KEY=
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
    STRIPE_WEBHOOK_SECRET= # Get from Stripe dashboard after creating webhook endpoint
    STRIPE_BASIC_PLAN_PRICE_ID=price_xxxx # Price ID for your Basic plan in Stripe
    STRIPE_PRO_PLAN_PRICE_ID=price_yyyy   # Price ID for your Pro plan in Stripe
    ```

5.  **Set up Prisma (if using a database):**
    *   Ensure your `prisma/schema.prisma` matches your database schema.
    *   Run migrations:
        ```bash
        npx prisma migrate dev --name init
        # or if you have existing schema: npx prisma db push
        ```
    *   Generate Prisma Client:
        ```bash
        npx prisma generate
        ```

### Running the Development Server

```bash
npm run dev
# or: yarn dev / pnpm dev