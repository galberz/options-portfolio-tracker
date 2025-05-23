# Contributor Guide for Options Portfolio Tracker

This guide helps the AI agent (Codex) understand how to work within this repository.

## Overview

This project is an **Options Portfolio Tracker** built with React, Vite, and TypeScript. The goal is to allow users to input their share and option positions, and visualize their potential Profit/Loss (P/L) under different market conditions.

**Key Directories:**

* `src/`: Main source code.
    * `components/`: React components for UI elements (forms, lists, chart).
    * `contexts/`: React context for managing global state (e.g., `PortfolioContext.tsx`).
    * `types/`: TypeScript type definitions (e.g., `portfolio.ts`, `transactions.ts`).
    * `utils/`: Utility functions, especially for financial calculations (e.g., `calculations.ts`, `black-scholes.ts`).
* `public/`: Static assets.

**Main Application Logic:**

* `src/App.tsx`: Main application component, orchestrates UI and state.
* `src/contexts/PortfolioContext.tsx`: Manages the transaction log and processes it to derive current portfolio state. This is central to the app's data handling.
* `src/utils/calculations.ts`: Contains the core financial logic for P/L calculations, option valuation, etc.
* `src/types/portfolio.ts` and `src/types/transactions.ts`: Define the data structures used throughout the application.

## Dev Environment Tips

* This project uses `pnpm` for package management.
* Ensure dependencies are installed with `pnpm install` before starting any development or validation tasks.
* The application is typically run in development mode using `pnpm dev`.

## Validation Instructions

Before submitting a Pull Request, please ensure the following checks pass:

1.  **Linting:** Run the linter to check for code style and quality issues.
    ```bash
    pnpm lint
    ```
    Please fix any errors or warnings reported by the linter.

2.  **TypeScript Check & Build:** Ensure the project builds successfully without TypeScript errors.
    ```bash
    pnpm build
    ```
    This command also type-checks the entire application.

3.  **Testing (If Applicable):**
    * Currently, no explicit test scripts (e.g., `pnpm test`) or test files are visible in the `package.json` or project structure.
    * If unit or integration tests are added (e.g., using Vitest, Jest, or React Testing Library), provide instructions here on how to run them. For example: `pnpm test` or `pnpm vitest run`.
    * Always add or update tests for the code you change, even if not explicitly asked.

## How to Work in This Repository

* **Focus on Clarity:** Ensure code is well-commented, especially complex financial calculations or state management logic.
* **TypeScript Best Practices:** Adhere to strong typing. Update or create new types in `src/types/` as needed.
* **Component Structure:** Keep components focused and reusable.
* **State Management:** Primarily use React Context (`PortfolioContext.tsx`) for global state. Local component state is fine for UI-specific concerns.
* **Calculations:** All financial logic should reside in `src/utils/calculations.ts` or related utility files. Ensure these are pure functions where possible and well-tested if tests are introduced.

## Pull Request (PR) Instructions

* **Title Format:** `[Feature/Fix/Refactor] Brief description of changes`
    * Example: `[Feature] Add support for dividend transactions`
    * Example: `[Fix] Correct P/L calculation for short puts`
* **Description:**
    * Clearly describe the problem you are solving or the feature you are adding.
    * Explain your solution.
    * Mention any relevant issue numbers.
    * If there are UI changes, include screenshots or GIFs if possible.
    * Confirm that all validation steps (linting, build, tests if any) pass.

## Potential Areas for Contribution / Improvement

* Implementing editing functionality for existing transactions in `PortfolioContext.tsx` and relevant forms.
* Adding more transaction types (e.g., dividends, stock splits, option assignment/exercise closure).
* Expanding the `src/components/TradeForm.tsx` if it's intended for more generic trade entries.
* Improving the accuracy or feature set of the Black-Scholes model or other financial calculations.
* Adding comprehensive unit and integration tests.
* Persisting user data beyond local storage (e.g., to a backend).

Thank you for contributing!