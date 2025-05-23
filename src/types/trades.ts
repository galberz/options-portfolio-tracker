import { OptionType, PositionType } from './portfolio';

// --- Transaction Types Enum ---
export enum TransactionType {
    BUY_SHARE = 'BUY_SHARE',
    SELL_SHARE = 'SELL_SHARE',
    SELL_TO_OPEN_OPTION = 'SELL_TO_OPEN_OPTION', // Write/Short an option
    BUY_TO_OPEN_OPTION = 'BUY_TO_OPEN_OPTION',   // Buy a long option
    BUY_TO_CLOSE_OPTION = 'BUY_TO_CLOSE_OPTION', // Buy back a short option
    SELL_TO_CLOSE_OPTION = 'SELL_TO_CLOSE_OPTION',// Sell a long option
    OPTION_EXPIRED = 'OPTION_EXPIRED',          // Option expired (assume OTM for now)
    OPTION_ASSIGNED = 'OPTION_ASSIGNED',        // Short option assigned (results in share trade)
    OPTION_EXERCISED = 'OPTION_EXERCISED',      // Long option exercised (results in share trade)
    // Future: DIVIDEND, ADJUSTMENT, etc.
}

// --- Base Transaction Interface ---
export interface BaseTransaction {
    id: string;          // Unique ID for the transaction event itself
    date: string;        // Date of the transaction (YYYY-MM-DD)
    ticker: string;      // Underlying ticker symbol
    transactionType: TransactionType;
    notes?: string;      // Optional user notes for this transaction
}

// --- Specific Transaction Interfaces ---

// For buying or selling shares directly
export interface ShareTransaction extends BaseTransaction {
    transactionType: TransactionType.BUY_SHARE | TransactionType.SELL_SHARE;
    quantity: number;         // Number of shares involved in this transaction
    pricePerShare: number;    // Price per share for this specific transaction
    commission?: number;      // Optional commission for this transaction
    // For SELL_SHARE, linking to specific BUY lots is complex (tax implications). We'll handle cost basis averaging later.
}

// For opening a new option position (long or short)
export interface OptionOpenTransaction extends BaseTransaction {
    transactionType: TransactionType.SELL_TO_OPEN_OPTION | TransactionType.BUY_TO_OPEN_OPTION;
    optionType: OptionType;   // 'call' or 'put'
    strikePrice: number;      // Option strike price
    expirationDate: string;   // Option expiration date (YYYY-MM-DD)
    quantity: number;         // Number of contracts opened
    premiumPerContract: number; // TOTAL premium per contract received (STO) or paid (BTO) for this transaction
    commission?: number;       // Optional commission
    // This transaction creates an 'open' option position. We need a way to link it to its closure later.
    // Let's add an 'optionId' that stays consistent for the life of a specific contract group.
    optionId: string; // Unique ID for this specific option contract batch (e.g., MSFT 250C 2024-12-20)
                     // Can be generated based on details or be a UUID associated with the first open.
                     // All related transactions (open, close, expire, assign) for the SAME contracts share this ID.
}

// For closing an existing option position (partially or fully)
export interface OptionCloseTransaction extends BaseTransaction {
    transactionType: TransactionType.BUY_TO_CLOSE_OPTION | TransactionType.SELL_TO_CLOSE_OPTION;
    quantity: number;         // Number of contracts being closed by this transaction
    premiumPerContract: number; // TOTAL premium per contract paid (BTC) or received (STC) for closing
    commission?: number;
    // Needs to link back to the specific open position(s) being closed.
    optionId: string; // Links to the OptionOpenTransaction.optionId being closed
}

// For an option expiring (typically OTM, assumed worthless for now)
export interface OptionExpirationTransaction extends BaseTransaction {
    transactionType: TransactionType.OPTION_EXPIRED;
    quantity: number; // Number of contracts that expired
    optionId: string; // Links to the OptionOpenTransaction.optionId that expired
}

// For an option being assigned (short position) or exercised (long position)
// This event signifies the option contract is closed and triggers a share transaction at the strike price.
export interface OptionAssignmentExerciseTransaction extends BaseTransaction {
    transactionType: TransactionType.OPTION_ASSIGNED | TransactionType.OPTION_EXERCISED;
    quantity: number; // Number of contracts assigned/exercised (determining shares: quantity * 100)
    strikePrice: number; // The strike price at which shares are transacted
    optionId: string; // Links to the OptionOpenTransaction.optionId that was assigned/exercised
    // The system needs to internally recognize that this closes the option and
    // implicitly creates a BUY_SHARE or SELL_SHARE transaction at the strike price.
}

// --- Union Type for All Transactions ---
export type Transaction =
    | ShareTransaction
    | OptionOpenTransaction
    | OptionCloseTransaction
    | OptionExpirationTransaction
    | OptionAssignmentExerciseTransaction;

// --- We might also need a way to represent the state derived from transactions ---
// Keep existing Portfolio types for representing the calculated *current* state if needed

import { SharePosition, OptionPosition } from './portfolio';

// Represents the calculated state of the portfolio *after* processing transactions
export interface ProcessedPortfolio {
    openShares: SharePosition[]; // Shares currently held
    openOptions: OptionPosition[]; // Options currently held
    realizedPL: number; // Total realized P/L from closed trades/events
    transactionLog: Transaction[]; // The source log
    // Could add more derived data: cash balance, historical P/L points, etc.
} 