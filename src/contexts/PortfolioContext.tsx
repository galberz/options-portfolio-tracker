import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
// --- START: Import Transaction Types ---
import { 
  Transaction, 
  ProcessedPortfolio, 
  TransactionType,
  OptionAssignmentExerciseTransaction 
} from '../types/transactions'; // Import TransactionType and OptionAssignmentExerciseTransaction
import { 
  Portfolio, 
  SharePosition, 
  OptionPosition,
  OptionType,
  PositionType 
} from '../types/portfolio'; // Import OptionType and PositionType
// --- END: Import Transaction Types ---

// Define the shape of the context value
interface PortfolioContextType {
  // --- START: Replace old state with transaction log and processed data ---
  transactionLog: Transaction[];
  processedPortfolio: ProcessedPortfolio | null; // Holds calculated open positions, P/L etc. (null initially)
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void; // Unified function to add any transaction
  // loadTransactions: (loadedTransactions: Transaction[]) => void; // Function to load a log (e.g., import) - TODO later
  // removeTransaction: (id: string) => void; // TODO later
  // updateTransaction: (id: string, updatedData: Omit<Transaction, 'id'>) => void; // TODO later
  // --- START: Add Editing State and Functions ---
  editingPositionId: string | null; // ID of the item being edited
  editingPositionType: 'share' | 'option' | null; // Type of item being edited
  startEditing: (id: string, type: 'share' | 'option') => void; // Function to begin editing
  cancelEditing: () => void; // Function to stop editing
  updateShare: (id: string, updatedShareData: Omit<SharePosition, 'id'>) => void;
  updateOption: (id: string, updatedOptionData: Omit<OptionPosition, 'id'>) => void;
  // toggleInclusion... needs rethinking with transactions. Maybe applied during calculation or to derived state.
  // --- END: Replace old state ---
}

// Create the context with an undefined initial value
const PortfolioContext = createContext<PortfolioContextType | undefined>(
  undefined
);

// Define the props for the provider component
interface PortfolioProviderProps {
  children: ReactNode;
}

// Initial empty state for the portfolio
// --- START: Define initial states ---
const initialTransactionLog: Transaction[] = [];
const initialProcessedPortfolio: ProcessedPortfolio = {
  openShares: [],
  openOptions: [],
  realizedPL: 0,
  transactionLog: [],
};
// Key for local storage
// Update local storage key to reflect the new structure
const LOCAL_STORAGE_KEY = 'optionsPortfolio_transactionLog';
// --- END: Define initial states ---

// Create the provider component
export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({
  children,
}) => {
  // --- START: Replace portfolio state with transactionLog ---
  const [transactionLog, setTransactionLog] = useState<Transaction[]>(() => {
    // Load initial state from local storage if available
    try {
      const savedPortfolio = localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedPortfolio ? JSON.parse(savedPortfolio) : initialTransactionLog;
    } catch (error) {
      console.error('Error loading portfolio from local storage:', error);
      return initialTransactionLog; // Load empty log on error
    }
  });

  // State to hold the calculated portfolio state (open positions, P/L)
  const [processedPortfolio, setProcessedPortfolio] = useState<ProcessedPortfolio | null>(null);
  // --- START: Add Editing State Variables ---
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingPositionType, setEditingPositionType] = useState<'share' | 'option' | null>(null);
  // --- END: Add Editing State Variables ---

  // Save portfolio to local storage whenever it changes
  useEffect(() => {
    try {
      // Save the transaction log, not the derived state
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transactionLog));
    } catch (error) {
      console.error('Error saving portfolio to local storage:', error);
    }
  }, [transactionLog]); // Depend on transactionLog

  // --- START: Define temporary state for open options during calculation ---
  // We need a more detailed structure to track cost basis etc. during processing
  interface OptionProcessingState {
      id: string; // The consistent optionId from transactions
      ticker: string;
      optionType: OptionType;
      strikePrice: number;
      expirationDate: string;
      positionType: PositionType; // 'long' or 'short'
      quantity: number; // Current open quantity
      // Track total premium paid (long) or received (short) for the open contracts
      // For shorts: Positive value represents net premium received
      // For longs: Negative value represents net premium paid (cost)
      netPremiumValue: number;
      commissionPaid: number; // Cumulative commission for these open contracts
      // Store the original open transaction ID for potential reference? Maybe not needed now.
  }
  // --- END: Define temporary state ---

  // --- START: Recalculate Processed Portfolio when Log Changes ---
  const calculateProcessedPortfolio = useCallback((log: Transaction[]): ProcessedPortfolio => {
    console.log(`[PortfolioContext] Recalculating portfolio from ${log.length} transactions...`);

    // --- State Tracking Variables ---
    const shareQuantities: { [ticker: string]: number } = {};
    const shareTotalCosts: { [ticker: string]: number } = {};
    const openOptionStates: { [optionId: string]: OptionProcessingState } = {}; // Map to track open options by their shared optionId
    let cumulativeRealizedPL = 0;

    // --- Process Transactions Chronologically ---
    // Ensure log is sorted by date (should be handled by addTransaction)
    log.forEach(tx => {
      const ticker = tx.ticker.toUpperCase();
      const optionId = 'optionId' in tx ? tx.optionId : null; // Helper to get optionId if present

      // Helper function to get average cost/proceeds per contract for closing/assignment
      const getAvgPremiumPerContract = (optionState: OptionProcessingState | undefined): number => {
         if (!optionState || optionState.quantity === 0) return 0;
         // netPremiumValue is positive for shorts (received), negative for longs (paid)
         // We want the average value associated with opening the position.
         return optionState.netPremiumValue / optionState.quantity;
      };

       // Helper function to handle the share transaction part of assignment/exercise
       const processAssignmentShareLeg = (
           assignmentTx: OptionAssignmentExerciseTransaction,
           assignedOptionState: OptionProcessingState
       ) => {
           const sharesToTrade = assignedOptionState.quantity * 100; // Assignment is per contract
           const strike = assignmentTx.strikePrice;
           const assignedTicker = assignmentTx.ticker.toUpperCase();
           let shareTxType: TransactionType.BUY_SHARE | TransactionType.SELL_SHARE | null = null;
           const sharePrice = strike; // Transaction occurs at strike

           // Determine if assignment results in BUY or SELL of shares
           if (assignedOptionState.positionType === 'short') { // Assigned on a short option
               if (assignedOptionState.optionType === 'call') {
                   // Short call assigned -> SELL shares at strike
                   shareTxType = TransactionType.SELL_SHARE;
               } else { // put
                   // Short put assigned -> BUY shares at strike
                   shareTxType = TransactionType.BUY_SHARE;
               }
           } else { // Exercised a long option
               if (assignedOptionState.optionType === 'call') {
                   // Long call exercised -> BUY shares at strike
                   shareTxType = TransactionType.BUY_SHARE;
               } else { // put
                   // Long put exercised -> SELL shares at strike
                   shareTxType = TransactionType.SELL_SHARE;
               }
           }

           if (shareTxType) {
               console.log(`[Calc] Assignment/Exercise (${assignmentTx.transactionType}) on ${assignedTicker} ${strike} ${assignedOptionState.optionType} triggering: ${shareTxType} ${sharesToTrade} shares @ ${strike}`);
               // --- Process the synthetic share transaction ---
               if (shareTxType === TransactionType.BUY_SHARE) {
                   const cost = sharesToTrade * sharePrice; // No commission assumed on assignment leg itself
                   shareQuantities[assignedTicker] = (shareQuantities[assignedTicker] || 0) + sharesToTrade;
                   shareTotalCosts[assignedTicker] = (shareTotalCosts[assignedTicker] || 0) + cost;
                   console.log(`[Calc] --> Processed synthetic BUY_SHARE: New Qty: ${shareQuantities[assignedTicker]}, New Total Cost: ${shareTotalCosts[assignedTicker]}`);
               } else { // SELL_SHARE
                   const currentQty = shareQuantities[assignedTicker] || 0;
                   const currentTotalCost = shareTotalCosts[assignedTicker] || 0;
                   let effectiveSellQty = sharesToTrade;

                   if (currentQty < effectiveSellQty) {
                       console.warn(`[Calc] Assignment requires selling ${effectiveSellQty} ${assignedTicker} shares, but only hold ${currentQty}. Selling available amount.`);
                       effectiveSellQty = currentQty;
                       // Note: This scenario (naked short call assigned, or exercising put without shares)
                       // might need more complex handling (negative share qty?) depending on requirements.
                       // For now, we cap the sale at available shares.
                   }

                   if (effectiveSellQty > 0 && currentQty > 0) {
                       const avgCostBasisPerShare = currentTotalCost / currentQty;
                       const costOfSoldShares = avgCostBasisPerShare * effectiveSellQty;
                       const proceeds = effectiveSellQty * sharePrice; // No commission assumed
                       const realizedPLFromSale = proceeds - costOfSoldShares;

                       cumulativeRealizedPL += realizedPLFromSale; // Add P/L from the share leg

                       shareQuantities[assignedTicker] = currentQty - effectiveSellQty;
                       shareTotalCosts[assignedTicker] = currentTotalCost - costOfSoldShares;
                       console.log(`[Calc] --> Processed synthetic SELL_SHARE: Qty: ${effectiveSellQty}, Price: ${sharePrice}, Avg Cost: ${avgCostBasisPerShare.toFixed(2)}, Share P/L: ${realizedPLFromSale.toFixed(2)}, New Qty: ${shareQuantities[assignedTicker]}, New Total Cost: ${shareTotalCosts[assignedTicker]}`);
                       if (shareQuantities[assignedTicker] < 0.0001) {
                           delete shareQuantities[assignedTicker];
                           delete shareTotalCosts[assignedTicker];
                       }
                   } else if (effectiveSellQty > 0) {
                       // Selling shares when none are held (e.g., exercising long put with no shares)
                       // This creates a short share position. Basic handling for now:
                       shareQuantities[assignedTicker] = (shareQuantities[assignedTicker] || 0) - effectiveSellQty;
                       // Cost basis for short positions needs careful thought, often marked-to-market.
                       // Let's track the proceeds as a negative cost for now.
                       shareTotalCosts[assignedTicker] = (shareTotalCosts[assignedTicker] || 0) - (effectiveSellQty * sharePrice);
                       console.log(`[Calc] --> Processed synthetic SELL_SHARE (entering short position?): Qty: ${effectiveSellQty}, New Qty: ${shareQuantities[assignedTicker]}, New Total Cost: ${shareTotalCosts[assignedTicker]}`);
                   }
               }
           } else {
              console.error("Could not determine share transaction type for assignment/exercise:", assignmentTx);
           }
       };

      switch (tx.transactionType) {
        // --- Share Transactions (Keep existing logic) ---
        case TransactionType.BUY_SHARE: {
          if ('quantity' in tx && 'pricePerShare' in tx) {
            const cost = tx.quantity * tx.pricePerShare + (tx.commission ?? 0);
            shareQuantities[ticker] = (shareQuantities[ticker] || 0) + tx.quantity;
            shareTotalCosts[ticker] = (shareTotalCosts[ticker] || 0) + cost;
            // console.log(`[Calc] Processed BUY_SHARE: ${ticker}, Qty: ${tx.quantity}, New Total Qty: ${shareQuantities[ticker]}`);
          } else { console.warn("BUY_SHARE transaction missing fields:", tx); }
          break;
        }
        case TransactionType.SELL_SHARE: {
          if ('quantity' in tx && 'pricePerShare' in tx) {
            const currentQty = shareQuantities[ticker] || 0;
            const currentTotalCost = shareTotalCosts[ticker] || 0;
            let sellQty = tx.quantity;

            if (currentQty < sellQty) {
              console.warn(`[Calc] Attempting to sell ${sellQty} ${ticker} shares, but only hold ${currentQty}. Selling available.`);
              sellQty = currentQty;
            }

            if (sellQty > 0 && currentQty > 0) {
              const avgCostBasisPerShare = currentTotalCost / currentQty;
              const costOfSoldShares = avgCostBasisPerShare * sellQty;
              const proceeds = sellQty * tx.pricePerShare - (tx.commission ?? 0);
              const realizedPLFromSale = proceeds - costOfSoldShares;
              cumulativeRealizedPL += realizedPLFromSale;
              shareQuantities[ticker] = currentQty - sellQty;
              shareTotalCosts[ticker] = currentTotalCost - costOfSoldShares;
              // console.log(`[Calc] Processed SELL_SHARE: ${ticker}, Qty: ${sellQty}, P/L: ${realizedPLFromSale.toFixed(2)}, New Qty: ${shareQuantities[ticker]}`);
              if (shareQuantities[ticker] < 0.0001) {
                delete shareQuantities[ticker]; delete shareTotalCosts[ticker];
              }
            } else { /* console.warn(`[Calc] SELL_SHARE of ${ticker} skipped: quantity zero.`); */ }
          } else { console.warn("SELL_SHARE transaction missing fields:", tx); }
          break;
        }

        // --- Option Opening Transactions ---
        case TransactionType.SELL_TO_OPEN_OPTION:
        case TransactionType.BUY_TO_OPEN_OPTION: {
           if (optionId && 'quantity' in tx && 'premiumPerContract' in tx && 'optionType' in tx && 'strikePrice' in tx && 'expirationDate' in tx) {
             const existingState = openOptionStates[optionId];
             const premiumEffect = tx.premiumPerContract * tx.quantity;
             const commission = tx.commission ?? 0;
             const positionType = tx.transactionType === TransactionType.SELL_TO_OPEN_OPTION ? 'short' : 'long';

             if (existingState) {
               // Adding more contracts to an existing identical option position
               if (existingState.positionType !== positionType) {
                   console.error(`[Calc] Error: Cannot add ${positionType} contracts to existing ${existingState.positionType} position for optionId ${optionId}. Tx:`, tx);
                   break; // Skip this transaction
               }
               console.log(`[Calc] Adding to existing Option State ${optionId}. Before:`, { ...existingState });
               existingState.quantity += tx.quantity;
               existingState.netPremiumValue += (positionType === 'short' ? premiumEffect : -premiumEffect);
               existingState.commissionPaid += commission;
               console.log(`[Calc] Added to Option State ${optionId}. After:`, { ...existingState });
             } else {
               // Opening a new option position
               openOptionStates[optionId] = {
                 id: optionId,
                 ticker: ticker,
                 optionType: tx.optionType,
                 strikePrice: tx.strikePrice,
                 expirationDate: tx.expirationDate,
                 positionType: positionType,
                 quantity: tx.quantity,
                 netPremiumValue: (positionType === 'short' ? premiumEffect : -premiumEffect),
                 commissionPaid: commission,
               };
               console.log(`[Calc] Opened New Option State ${optionId}: Type: ${positionType} ${tx.optionType}, Qty: ${tx.quantity}, Net Premium: ${openOptionStates[optionId].netPremiumValue}`);
             }
           } else {
             console.warn("Option OPEN transaction missing required fields or optionId:", tx);
           }
           break;
         }

        // --- Option Closing Transactions ---
        case TransactionType.BUY_TO_CLOSE_OPTION: // Closing a SHORT
        case TransactionType.SELL_TO_CLOSE_OPTION: { // Closing a LONG
           if (optionId && 'quantity' in tx && 'premiumPerContract' in tx) {
             const closingQty = tx.quantity;
             const closingPremiumEffect = tx.premiumPerContract * closingQty;
             const commission = tx.commission ?? 0;
             const closingType = tx.transactionType === TransactionType.BUY_TO_CLOSE_OPTION ? 'short' : 'long'; // Type of position being closed

             const openState = openOptionStates[optionId];

             if (!openState) {
               console.error(`[Calc] Error: Attempting to close option ${optionId} which is not tracked as open. Tx:`, tx);
               break;
             }
             if (openState.positionType !== closingType) {
                console.error(`[Calc] Error: Transaction type ${tx.transactionType} does not match open position type ${openState.positionType} for ${optionId}. Tx:`, tx);
                break;
             }
             if (openState.quantity < closingQty) {
               console.warn(`[Calc] Attempting to close ${closingQty} contracts of ${optionId}, but only ${openState.quantity} are open. Closing available.`);
               tx.quantity = openState.quantity; // Adjust to actual open quantity
             }

             const actualClosingQty = tx.quantity; // Use potentially adjusted quantity
             if (actualClosingQty <= 0) break; // Nothing to close

             const avgPremiumPerContractOpened = getAvgPremiumPerContract(openState);
             const commissionPerContractOpened = openState.quantity > 0 ? openState.commissionPaid / openState.quantity : 0;

             // Calculate P/L for the contracts being closed
             let realizedPLFromOption = 0;
             if (openState.positionType === 'short') { // Was short, BTC
               // P/L = (Premium Received when Opened) - (Premium Paid to Close) - Commissions
               realizedPLFromOption = (avgPremiumPerContractOpened * actualClosingQty) - (closingPremiumEffect) - (commissionPerContractOpened * actualClosingQty) - commission;
             } else { // Was long, STC
               // P/L = (Premium Received when Closed) - (Premium Paid when Opened) - Commissions
               realizedPLFromOption = (closingPremiumEffect) - (-avgPremiumPerContractOpened * actualClosingQty) - (commissionPerContractOpened * actualClosingQty) - commission;
             }
             cumulativeRealizedPL += realizedPLFromOption;

             console.log(`[Calc] Closed Option ${optionId}: Type: ${openState.positionType} ${openState.optionType}, Qty: ${actualClosingQty}, Open Prem/Cont: ${avgPremiumPerContractOpened.toFixed(2)}, Close Prem/Cont: ${tx.premiumPerContract.toFixed(2)}, Option P/L: ${realizedPLFromOption.toFixed(2)}`);

             // Update open state
             openState.quantity -= actualClosingQty;
             openState.netPremiumValue -= (avgPremiumPerContractOpened * actualClosingQty); // Remove value of closed contracts
             openState.commissionPaid -= (commissionPerContractOpened * actualClosingQty); // Remove commission of closed contracts

             // Remove state if fully closed
             if (openState.quantity < 0.0001) {
               delete openOptionStates[optionId];
               console.log(`[Calc] Option state ${optionId} fully closed.`);
             } else {
               console.log(`[Calc] Option state ${optionId} partially closed. Remaining Qty: ${openState.quantity}`);
             }
           } else {
             console.warn("Option CLOSE transaction missing required fields or optionId:", tx);
           }
           break;
         }

        // --- Option Expiration ---
        case TransactionType.OPTION_EXPIRED: {
           if (optionId && 'quantity' in tx) {
               const expiringQty = tx.quantity;
               const openState = openOptionStates[optionId];

               if (!openState) {
                   console.error(`[Calc] Error: Attempting to expire option ${optionId} which is not tracked as open. Tx:`, tx);
                   break;
               }
                if (openState.quantity < expiringQty) {
                   console.warn(`[Calc] Attempting to expire ${expiringQty} contracts of ${optionId}, but only ${openState.quantity} are open. Expiring available.`);
                   tx.quantity = openState.quantity; // Adjust
               }
               const actualExpiringQty = tx.quantity;
               if (actualExpiringQty <= 0) break;

               const avgPremiumPerContractOpened = getAvgPremiumPerContract(openState);
               const commissionPerContractOpened = openState.quantity > 0 ? openState.commissionPaid / openState.quantity : 0;

               // Assume expired OTM (worthless)
               // P/L = Net Premium Value - Commissions
               let realizedPLFromOption = 0;
               if (openState.positionType === 'short') {
                   // Kept the premium
                   realizedPLFromOption = (avgPremiumPerContractOpened * actualExpiringQty) - (commissionPerContractOpened * actualExpiringQty);
               } else { // Long
                   // Lost the premium paid
                   realizedPLFromOption = (-avgPremiumPerContractOpened * actualExpiringQty) - (commissionPerContractOpened * actualExpiringQty);
               }
               cumulativeRealizedPL += realizedPLFromOption;

               console.log(`[Calc] Expired Option ${optionId}: Type: ${openState.positionType} ${openState.optionType}, Qty: ${actualExpiringQty}, P/L: ${realizedPLFromOption.toFixed(2)}`);

               // Update open state
               openState.quantity -= actualExpiringQty;
               openState.netPremiumValue -= (avgPremiumPerContractOpened * actualExpiringQty);
               openState.commissionPaid -= (commissionPerContractOpened * actualExpiringQty);

               // Remove state if fully closed
               if (openState.quantity < 0.0001) {
                   delete openOptionStates[optionId];
                   console.log(`[Calc] Option state ${optionId} fully closed by expiration.`);
               } else {
                    console.log(`[Calc] Option state ${optionId} partially expired. Remaining Qty: ${openState.quantity}`);
               }
           } else {
               console.warn("Option EXPIRED transaction missing fields or optionId:", tx);
           }
           break;
        }

        // --- Option Assignment / Exercise ---
        case TransactionType.OPTION_ASSIGNED: // Short assigned
        case TransactionType.OPTION_EXERCISED: { // Long exercised
            if (optionId && 'quantity' in tx && 'strikePrice' in tx) {
                const assignedQty = tx.quantity;
                const openState = openOptionStates[optionId];

                if (!openState) {
                   console.error(`[Calc] Error: Attempting assignment/exercise on option ${optionId} which is not tracked as open. Tx:`, tx);
                   break;
                }
                if (openState.quantity < assignedQty) {
                    console.warn(`[Calc] Attempting assignment on ${assignedQty} contracts of ${optionId}, but only ${openState.quantity} are open. Assigning available.`);
                    tx.quantity = openState.quantity; // Adjust
                }
                const actualAssignedQty = tx.quantity;
                if (actualAssignedQty <= 0) break;

                const avgPremiumPerContractOpened = getAvgPremiumPerContract(openState);
                const commissionPerContractOpened = openState.quantity > 0 ? openState.commissionPaid / openState.quantity : 0;

                // P/L for the option leg is realized now (similar to expiration, value is zero)
                let realizedPLFromOption = 0;
                if (openState.positionType === 'short') {
                   realizedPLFromOption = (avgPremiumPerContractOpened * actualAssignedQty) - (commissionPerContractOpened * actualAssignedQty);
                } else { // Long
                   realizedPLFromOption = (-avgPremiumPerContractOpened * actualAssignedQty) - (commissionPerContractOpened * actualAssignedQty);
                }
                cumulativeRealizedPL += realizedPLFromOption;

                console.log(`[Calc] Assigned/Exercised Option ${optionId}: Type: ${openState.positionType} ${openState.optionType}, Qty: ${actualAssignedQty}, Strike: ${tx.strikePrice}, Option Leg P/L: ${realizedPLFromOption.toFixed(2)}`);

                // --- Process the Share Leg ---
                // Create a temporary state representing the portion being assigned
                const portionAssigned: OptionProcessingState = { ...openState, quantity: actualAssignedQty };
                processAssignmentShareLeg(tx as OptionAssignmentExerciseTransaction, portionAssigned);

                // --- Update open state ---
                openState.quantity -= actualAssignedQty;
                openState.netPremiumValue -= (avgPremiumPerContractOpened * actualAssignedQty);
                openState.commissionPaid -= (commissionPerContractOpened * actualAssignedQty);

                // Remove state if fully closed
                if (openState.quantity < 0.0001) {
                   delete openOptionStates[optionId];
                   console.log(`[Calc] Option state ${optionId} fully closed by assignment/exercise.`);
                } else {
                    console.log(`[Calc] Option state ${optionId} partially assigned. Remaining Qty: ${openState.quantity}`);
                }

            } else {
                console.warn("Option ASSIGN/EXERCISE transaction missing fields or optionId:", tx);
            }
            break;
        }

        default:
          // console.warn("Unknown transaction type encountered:", tx.transactionType);
          break;
      }
    });

    // --- Construct the Derived State ---
    const finalOpenShares: SharePosition[] = Object.keys(shareQuantities).map(ticker => {
      const quantity = shareQuantities[ticker];
      const totalCost = shareTotalCosts[ticker];
      // Handle potential short positions (negative quantity) - cost basis needs care
      const costBasisPerShare = quantity > 0 ? totalCost / quantity : 0; // TODO: Refine cost basis for shorts

      return {
        id: `open_share_${ticker}`,
        ticker: ticker,
        quantity: quantity, // Can be negative for short positions
        costBasisPerShare: costBasisPerShare,
        purchaseDate: 'N/A (Aggregated)',
        isIncludedInAnalysis: true,
      };
    }).filter(share => Math.abs(share.quantity) > 0.0001); // Keep non-zero positions (including shorts)

    // Convert remaining open option states to the display format
    const finalOpenOptions: OptionPosition[] = Object.values(openOptionStates).map(state => {
       // Calculate premium per contract for display (based on remaining net value)
       const premiumPerContract = state.quantity > 0
         ? Math.abs(state.netPremiumValue / state.quantity) // Use absolute value, sign implied by positionType
         : 0;
       return {
         id: state.id, // Use the consistent optionId as the display ID
         ticker: state.ticker,
         quantity: state.quantity,
         optionType: state.optionType,
         positionType: state.positionType,
         strikePrice: state.strikePrice,
         // The 'premium' field in OptionPosition usually means the premium *at the time of the trade*.
         // Our calculated `premiumPerContract` here represents the average entry cost/credit
         // for the *remaining* open contracts. This might be okay for display, or we might
         // need to store original trade premiums if required. Let's use the average for now.
         premium: premiumPerContract,
         expirationDate: state.expirationDate,
         tradeDate: 'N/A (Aggregated)', // Cannot easily determine original trade date from aggregate
         isIncludedInAnalysis: true,
       };
    });

    // --- Log final states before returning ---
    console.log('[Calc] Final openOptionStates before mapping:', JSON.parse(JSON.stringify(openOptionStates))); // Deep copy for logging
    console.log('[Calc] Final finalOpenOptions after mapping:', finalOpenOptions);
    console.log(`[Calc] Calculation Complete. Open Shares: ${finalOpenShares.length}, Open Options: ${finalOpenOptions.length}, Realized P/L: ${cumulativeRealizedPL.toFixed(2)}`);
    // --- End Log ---

    return {
      openShares: finalOpenShares,
      openOptions: finalOpenOptions,
      realizedPL: cumulativeRealizedPL,
      transactionLog: log, // Add back the transactionLog as required by ProcessedPortfolio type
    };
  }, []); // End of useCallback for calculateProcessedPortfolio

  useEffect(() => {
    const result = calculateProcessedPortfolio(transactionLog);
    setProcessedPortfolio(result);
  }, [transactionLog, calculateProcessedPortfolio]); // Re-run when log changes
  // --- END: Recalculate Processed Portfolio ---

  // --- START: Implement addTransaction ---
  const addTransaction = useCallback((transactionData: Omit<Transaction, 'id'>) => {
    // Create a proper transaction based on the transaction type
    // This is a simplified implementation and might need more specific handling based on transaction type
    const newTransaction = {
      ...transactionData,
      id: `${transactionData.transactionType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    } as Transaction; // Type assertion to Transaction
    
    setTransactionLog((prevLog) => 
      [...prevLog, newTransaction].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    ); // Keep log sorted by date
  }, []);

  // --- START: Adapt/Deprecate Old Functions ---
  // These functions need to be re-thought in terms of adding/modifying *transactions*,
  // not directly manipulating the derived 'open' positions.
  // For now, keep the stubs for editing maybe, but ADDING should use addTransaction.
  // REMOVING needs careful thought (delete transaction? mark as void?).

  // TODO: Adapt updateShare/updateOption to modify the corresponding *transaction* in the log.
  // This is complex as it requires finding the correct transaction (e.g., the initial BUY_SHARE).
  const updateShare = useCallback((id: string, updatedShareData: Omit<SharePosition, 'id'>) => {
    console.warn("updateShare needs reimplementation for transaction log");
    // Placeholder - find relevant BUY_SHARE transaction and update it?
    /* setPortfolio((prev) => ({
      ...prev,
      shares: prev.shares.map((share) =>
        share.id === id ? { ...updatedShareData, id } : share
      ),
    }));
    setEditingPositionId(null); // Stop editing after update
    setEditingPositionType(null);
    */
  }, []);

  const updateOption = useCallback((id: string, updatedOptionData: Omit<OptionPosition, 'id'>) => {
    console.warn("updateOption needs reimplementation for transaction log");
    /* setPortfolio((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.id === id ? { ...updatedOptionData, id } : option
      ),
    }));
    setEditingPositionId(null); // Stop editing after update
    setEditingPositionType(null);
    */
  }, []);
  // --- END: Add Update Functions ---

  // --- START: Add Editing Control Functions ---
  const startEditing = useCallback((id: string, type: 'share' | 'option') => {
    setEditingPositionId(id);
    setEditingPositionType(type);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingPositionId(null);
    setEditingPositionType(null);
  }, []);
  // --- END: Add Editing Control Functions ---
  // --- END: Adapt/Deprecate Old Functions ---

  // Value provided by the context
  const contextValue: PortfolioContextType = {
    // --- START: Provide new state and functions ---
    transactionLog,
    processedPortfolio, // Provide the derived state
    addTransaction,
    // loadTransactions, // Add later
    // removeTransaction, // Add later
    // updateTransaction, // Add later
    // --- END: Provide new state and functions ---

    // --- Deprecated / Needs Rework ---
    editingPositionId,
    editingPositionType,
    startEditing,
    cancelEditing,
    updateShare, // Keep stub for now
    updateOption, // Keep stub for now
    // --- END: Provide editing state and functions ---
  };

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
};

// Custom hook to use the Portfolio context
export const usePortfolio = (): PortfolioContextType => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}; 