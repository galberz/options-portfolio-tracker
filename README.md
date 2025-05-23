# Options Portfolio Tracker

This application tracks option and share trades and visualizes potential profit/loss. It is built with React, Vite and TypeScript.

## Trade‑Based Workflow

1. Use **Share Form** to record share purchases. Each entry is stored as a `BUY_SHARE` transaction.
2. Use **Option Form** to record option trades (sell to open, buy to open, etc.). The trade date, quantity, strike and premium are required.
3. The portfolio and P/L chart are derived from the entire transaction log. Editing or deleting existing trades is not yet supported, so log additional transactions to close positions.

## Development

```bash
pnpm install
pnpm dev
```

Before submitting changes run the following checks:

```bash
pnpm lint
pnpm build
```

These commands must succeed before a pull request is created.
