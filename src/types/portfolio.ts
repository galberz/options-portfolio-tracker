// src/types/portfolio.ts

export type OptionType = 'call' | 'put';
export type PositionType = 'long' | 'short'; // long = bought, short = sold/written

// Base interface for common fields
interface BasePosition {
  id: string; // Unique identifier for each position entry
  ticker: string; // Underlying stock symbol (e.g., 'AAPL')
  quantity: number; // Number of shares or contracts
}

// Interface for holding shares
export interface SharePosition extends BasePosition {
  costBasisPerShare: number; // Price paid per share
  purchaseDate: string; // Date purchased (ISO 8601 format: "YYYY-MM-DD")
}

// Interface for holding options
export interface OptionPosition extends BasePosition {
  optionType: OptionType;
  positionType: PositionType;
  strikePrice: number;
  premium: number; // Premium received (for short) or paid (for long) per contract
  expirationDate: string; // Expiration date (ISO 8601 format: "YYYY-MM-DD")
  tradeDate: string; // Date the option was bought/sold (ISO 8601 format: "YYYY-MM-DD")
  // Note: 'quantity' represents the number of contracts (each typically controls 100 shares)
}

// Interface for the entire portfolio
export interface Portfolio {
  shares: SharePosition[];
  options: OptionPosition[];
  // We can add more portfolio-level properties later (e.g., name, description)
}

// Type for potential assignment events (we'll detail this later)
export interface AssignmentEvent {
  id: string;
  date: string; // Date of assignment
  optionId: string; // ID of the option that was assigned
  // Details about the resulting share transaction
} 