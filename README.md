# Big Bull 📈

Big Bull is a full-stack Indian stock market trading simulation platform. It allows users to simulate trading with real-time market data, manage a virtual portfolio, track watchlist instruments, and execute simulated trades with a custom-built order matching engine.

## Features

- **Live Market Data**: Integrates with Yahoo Finance API to fetch real-time stock prices and historical charting data for Indian equities (NSE).
- **Simulated Trading**: Users can place Market and Limit orders (Buy/Sell) which are processed by a robust matching engine.
- **Portfolio Analytics**: Track live equity value, realized/unrealized P&L, sector concentration, and margin requirement estimates.
- **Secure Authentication**: Includes JWT-based authentication and KYC onboarding flows.
- **Responsive Dashboard**: Beautiful, modern UI built with React, Vite, and Tailwind CSS.

## Tech Stack

### Frontend (Client)
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS (Custom emerald/slate palette)
- **Routing**: React Router DOM
- **Charts**: Lightweight Charts (TradingView)
- **State Management**: React Hooks

### Backend (Server)
- **Runtime**: Node.js & Express.js
- **Database**: PostgreSQL (Relational schema for orders, trades, and holdings)
- **Caching**: Redis (For high-speed market data caching)
- **Market Data**: `yahoo-finance2` library
- **Real-time**: Socket.IO (for live price streaming)

## Project Structure

- `/client` - Frontend React application
- `/server` - Backend Node.js application
- `/server/src/controllers` - Route controllers (Trade, Market, Analytics, Watchlist)
- `/server/src/services` - Core business logic (Matching Engine, Yahoo Finance integrations)

## Getting Started

### Prerequisites
- Node.js (v16+)
- PostgreSQL
- Redis

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Saumya2721/Big-Bull.git
   cd Big-Bull
   ```

2. **Backend Setup:**
   ```bash
   cd server
   npm install
   ```
   - Create a `.env` file in the `server` directory and add your PostgreSQL database credentials (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_DATABASE`, `DB_PORT`) and Redis credentials (`REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`).
   - Run the initial database setup scripts (e.g. `schema.sql`) to initialize the `bigbull` schema.
   - Start the backend server:
     ```bash
     npm run dev
     ```

3. **Frontend Setup:**
   ```bash
   cd ../client
   npm install
   ```
   - Create a `.env` file in the `client` directory (if required) pointing to the API.
   - Start the frontend dev server:
     ```bash
     npm run dev
     ```

## Disclaimer
This platform is an educational simulation. It does not process real money and is not affiliated with any actual financial brokerage.
