import React, { useMemo, useState } from "react";
import { usePortfolio } from "../../contexts/PortfolioContext";
import { Transaction, TransactionType } from "../../types/trades";

interface SortConfig {
  key: keyof TradeRow;
  direction: "asc" | "desc";
}

interface TradeRow {
  id: string;
  date: string;
  symbol: string;
  type: string;
  action: string;
  quantity: number;
  price: number | string;
  pl: string;
  status: string;
  brokerage: string;
}

const mapTransactionToRow = (tx: Transaction): TradeRow => {
  let type = "Share";
  let action = "";
  let quantity = 0;
  let price: number | string = "-";

  switch (tx.transactionType) {
    case TransactionType.BUY_SHARE:
    case TransactionType.SELL_SHARE:
      quantity = tx.quantity;
      price = tx.pricePerShare;
      action =
        tx.transactionType === TransactionType.BUY_SHARE ? "Buy" : "Sell";
      break;
    case TransactionType.SELL_TO_OPEN_OPTION:
    case TransactionType.BUY_TO_OPEN_OPTION:
      type = "Option";
      quantity = tx.quantity;
      price = tx.premiumPerContract;
      action =
        tx.transactionType === TransactionType.SELL_TO_OPEN_OPTION
          ? "Sell to Open"
          : "Buy to Open";
      break;
    case TransactionType.BUY_TO_CLOSE_OPTION:
    case TransactionType.SELL_TO_CLOSE_OPTION:
      type = "Option";
      quantity = tx.quantity;
      price = tx.premiumPerContract;
      action =
        tx.transactionType === TransactionType.BUY_TO_CLOSE_OPTION
          ? "Buy to Close"
          : "Sell to Close";
      break;
    case TransactionType.OPTION_EXPIRED:
      type = "Option";
      quantity = tx.quantity;
      price = 0;
      action = "Expire";
      break;
    case TransactionType.OPTION_ASSIGNED:
    case TransactionType.OPTION_EXERCISED:
      type = "Option";
      quantity = tx.quantity;
      price = tx.strikePrice;
      action =
        tx.transactionType === TransactionType.OPTION_ASSIGNED
          ? "Assigned"
          : "Exercised";
      break;
    default:
      break;
  }

  return {
    id: tx.id,
    date: tx.date,
    symbol: tx.ticker.toUpperCase(),
    type,
    action,
    quantity,
    price,
    pl: "-",
    status: "Completed",
    brokerage: "-",
  };
};

export const TradeTable: React.FC = () => {
  const { transactionLog } = usePortfolio();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });

  const trades = useMemo(
    () => transactionLog.map(mapTransactionToRow),
    [transactionLog],
  );

  const sortedTrades = useMemo(() => {
    const sorted = [...trades];
    sorted.sort((a, b) => {
      const key = sortConfig.key;
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [trades, sortConfig]);

  const requestSort = (key: keyof TradeRow) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const getSortIndicator = (key: keyof TradeRow) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " \u2191" : " \u2193";
  };

  if (trades.length === 0) {
    return <p>No trades recorded yet.</p>;
  }

  return (
    <div className="position-list-container">
      <h2>Trade History</h2>
      <table className="position-table">
        <thead>
          <tr>
            <th onClick={() => requestSort("date")}>
              Date{getSortIndicator("date")}
            </th>
            <th onClick={() => requestSort("symbol")}>
              Symbol{getSortIndicator("symbol")}
            </th>
            <th onClick={() => requestSort("type")}>
              Type{getSortIndicator("type")}
            </th>
            <th onClick={() => requestSort("action")}>
              Action{getSortIndicator("action")}
            </th>
            <th onClick={() => requestSort("quantity")}>
              Qty{getSortIndicator("quantity")}
            </th>
            <th onClick={() => requestSort("price")}>
              Price{getSortIndicator("price")}
            </th>
            <th onClick={() => requestSort("pl")}>
              P/L{getSortIndicator("pl")}
            </th>
            <th onClick={() => requestSort("status")}>
              Status{getSortIndicator("status")}
            </th>
            <th onClick={() => requestSort("brokerage")}>
              Brokerage{getSortIndicator("brokerage")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTrades.map((trade) => (
            <tr key={trade.id}>
              <td>{trade.date}</td>
              <td>{trade.symbol}</td>
              <td>{trade.type}</td>
              <td>{trade.action}</td>
              <td>{trade.quantity}</td>
              <td>
                {typeof trade.price === "number"
                  ? `$${trade.price.toFixed(2)}`
                  : trade.price}
              </td>
              <td>{trade.pl}</td>
              <td>{trade.status}</td>
              <td>{trade.brokerage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
