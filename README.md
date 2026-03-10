# incomash

An income tracker inspired by [strc.live](https://strc.live) — get a clear overview of your **STRC** and **SATA** holdings, portfolio allocation, and projected monthly/annual dividend income.

## Features

- 📊 **Holdings overview** — enter your STRC and SATA share counts to instantly see total portfolio value
- 💰 **Income projections** — view estimated monthly and annual dividend income based on configurable yield rates
- 📈 **Live prices** — stock prices are fetched in real time from the Alpha Vantage API (with 1-hour caching and localStorage persistence)
- ⚖️ **Allocation slider** — interactively rebalance your STRC/SATA allocation to model different portfolio mixes
- ⚙️ **Advanced settings** — customize yield percentages for each asset to reflect your own assumptions
- 💾 **Persistent state** — share counts and settings are saved to localStorage so your data survives page refreshes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (built on @base-ui/react) |
| Icons | lucide-react |
| Prices API | Alpha Vantage |

## Getting Started

### Prerequisites

- Node.js 18+
- An [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key) (free tier available)

### Setup

```bash
# Install dependencies
npm install

# Set your Alpha Vantage API key
echo "VITE_ALPHA_VANTAGE_API_KEY=your_key_here" > .env.local

# Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## How It Works

1. Enter the number of STRC and SATA shares you hold
2. Live prices are fetched from Alpha Vantage and cached locally for 1 hour
3. Portfolio value is calculated as `shares × price` for each asset
4. Income is estimated as `portfolio value × annual yield %`
5. Monthly income = annual income ÷ 12
6. Use the allocation slider or advanced settings to explore different scenarios

## Project Structure

```
src/
├── App.tsx              # Main application UI and calculation logic
├── hooks/
│   └── useStockPrice.ts # Live price fetching with caching
├── components/ui/       # Reusable shadcn UI components
└── lib/
    └── utils.ts         # Tailwind class merging utility
```

## License

MIT
