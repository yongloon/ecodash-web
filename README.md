# Economic Indicators Dashboard v3 (Next.js)

A comprehensive, visually engaging dashboard for tracking and comparing key national economic indicators, built with Next.js, TypeScript, Tailwind CSS, and Recharts.

**Live Demo:** [Link to deployed demo (if available)]

## Features

* **Comprehensive Indicators:** Tracks 33 key economic indicators across 8 categories (using mock data / FRED placeholders initially).
* **Visualizations:** Historical trends displayed using interactive Line, Bar, and Area charts (via Recharts).
* **Latest Data:** Shows the most recent value, date, and unit for each indicator.
* **Detailed Information:** Includes descriptions and source citations for transparency.
* **Categorized View:** Indicators organized into logical sections (Economic Output, Labor Market, Inflation, etc.) accessible via sidebar.
* **Overview Dashboard:** Summary cards highlight headline metrics (GDP, Unemployment, CPI, PMI, S&P 500, 10Y Yield).
* **Responsive Design:** Adapts to different screen sizes using Tailwind CSS.
* **Modern Tech Stack:** Built with Next.js App Router, TypeScript, and Server Components.
* **Basic Country Selection:** UI for country selection (US default) using URL query parameters. Data availability for non-US countries is limited in this version.
* **Theming:** Supports light and dark modes via Tailwind CSS variables (manual toggle not implemented).

## Screenshots

*(Add screenshots of the dashboard overview and category pages here)*

![Overview Page Screenshot](placeholder-overview.png)
![Category Page Screenshot](placeholder-category.png)

## Tech Stack

* **Framework:** [Next.js](https://nextjs.org/) (App Router)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **UI Components:** [Shadcn/ui](https://ui.shadcn.com/) (Cards, Tooltips, Select - Recommended)
* **Charting:** [Recharts](https://recharts.org/)
* **Data Fetching:** Next.js Server Components, `fetch` API (Mock data / API placeholders)
* **Icons:** [React Icons](https://react-icons.github.io/react-icons/), [Lucide React](https://lucide.dev/) (via Shadcn)
* **Date Formatting:** [date-fns](https://date-fns.org/)
* **Class Merging:** `clsx`, `tailwind-merge` (via Shadcn)

## Project Structure

```
economic-indicators-dashboard-v3/
├── src/
│   ├── app/                  # Next.js App Router (Pages & Layouts)
│   │   ├── (dashboard)/      # Dashboard route group
│   │   │   ├── category/[slug]/page.tsx # Dynamic category page
│   │   │   ├── layout.tsx    # Dashboard layout (Sidebar, Header)
│   │   │   └── page.tsx      # Overview page
│   │   ├── globals.css       # Global styles & theme variables
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── dashboard/        # Dashboard specific components
│   │   └── ui/               # Reusable UI elements (Card, Tooltip, Select etc.)
│   ├── lib/
│   │   ├── api.ts            # (Placeholder) API fetching logic
│   │   ├── indicators.ts     # Indicator definitions & metadata
│   │   ├── mockData.ts       # Mock data generation & fetch entry point
│   │   └── utils.ts          # Utility functions (cn, formatting)
├── .env.local            # (Create manually) For API keys
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

* Node.js (v18 or later recommended)
* npm or yarn or pnpm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/economic-indicators-dashboard-v3.git](https://github.com/your-username/economic-indicators-dashboard-v3.git)
    cd economic-indicators-dashboard-v3
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or: yarn install / pnpm install
    ```

3.  **(Optional but Recommended) Setup Shadcn/ui:**
    If you haven't already, initialize Shadcn/ui (this project assumes Card, Tooltip, Select are installed):
    ```bash
    npx shadcn-ui@latest init
    # Follow prompts (e.g., select Default style, Slate color, use CSS variables)
    npx shadcn-ui@latest add card tooltip select
    ```
    *If you choose not to use Shadcn, you will need to replace the components in `src/components/ui/` with your own implementations.*

4.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of the project. Add your FRED API key if you plan to implement the `fetchFredSeries` function.
    ```.env.local
    # Get from [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)
    FRED_API_KEY=YOUR_FRED_API_KEY_HERE

    # Add other keys as needed
    # ALPHA_VANTAGE_API_KEY=YOUR_ALPHA_VANTAGE_KEY_HERE
    ```
    *Note: The current code primarily uses the `generateMockData` function.*

### Running the Development Server

```bash
npm run dev
# or: yarn dev / pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works (Current State)

* **Data:** Primarily uses mock data generated by `src/lib/mockData.ts`. Indicator metadata in `src/lib/indicators.ts` includes placeholders for `apiSource` and `apiIdentifier` (like FRED series IDs).
* **Routing:** Uses Next.js App Router. The main layout is in `src/app/(dashboard)/layout.tsx`. Overview is `page.tsx`, categories are handled by `category/[slug]/page.tsx`.
* **State:** Country selection is managed via URL query parameters (`?country=XX`). Server Components read `searchParams` to determine the country and conditionally fetch/display data.
* **Fetching:** `fetchIndicatorData` in `mockData.ts` is the entry point. Currently, it defaults to `generateMockData`. Real API calls (e.g., `fetchFredSeries`) should be implemented in `src/lib/api.ts` and called from `fetchIndicatorData` based on `indicator.apiSource`.

## Next Steps & Future Improvements

* **Implement Real API Fetching:**
    * Create functions in `src/lib/api.ts` (e.g., `fetchFredSeries`, `fetchAlphaVantageData`).
    * Modify `fetchIndicatorData` in `src/lib/mockData.ts` to call the appropriate API function based on `indicator.apiSource` and `country`.
    * Handle API keys securely using `process.env`.
    * Implement robust error handling and loading states for API calls.
* **Data Transformation:** Handle necessary calculations (e.g., Year-over-Year or Month-over-Month percentage changes) if the API provides raw index/level data.
* **Expand Country Support:** Find reliable international APIs (World Bank, IMF, OECD) for indicators and integrate them into the fetching logic based on the selected country. Update the `CountrySelector` list accordingly.
* **Refine Charting:** Add features like date range selection, comparison overlays, more customization options.
* **Improve Trend Analysis:** Implement more sophisticated trend calculation in `SummaryCard`.
* **Complete Indicator List:** Ensure all 33 indicators have accurate metadata and working data sources (real or mock).
* **Add Theme Toggle:** Implement a button to switch between light and dark modes.
* **Testing:** Add unit and integration tests (e.g., using Jest, React Testing Library).
* **Accessibility (A11y):** Perform thorough accessibility checks and improvements.
* **Performance Optimization:** Analyze bundle sizes, optimize data fetching (caching, revalidation), and rendering.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request following standard procedures.

## License

[MIT](LICENSE) (or choose another appropriate license)
