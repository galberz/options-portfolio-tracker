import React, { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { TradeAction, Trade } from '../types/trades';

export const ShareForm: React.FC = () => {
  const { addTrade } = usePortfolio();

  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [costBasisPerShare, setCostBasisPerShare] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticker || quantity === '' || costBasisPerShare === '' || !purchaseDate) {
      alert('Please fill in all share fields.');
      return;
    }

    const tradeData: Omit<Trade, 'id'> = {
      ticker: ticker.toUpperCase(),
      action: TradeAction.BUY_SHARE,
      date: purchaseDate,
      quantity: Number(quantity),
      pricePerShare: Number(costBasisPerShare),
      brokerage: 0,
    };

    addTrade(tradeData);
    setTicker('');
    setQuantity('');
    setCostBasisPerShare('');
    setPurchaseDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="position-form">
      <h3>Add Share Purchase</h3>
      <div className="form-group">
        <label htmlFor="share-ticker">Ticker:</label>
        <input
          id="share-ticker"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter ticker symbol"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="share-quantity">Quantity:</label>
        <input
          id="share-quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="e.g., 10.5"
          step="any"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="share-cost-basis">Purchase Price per Share ($):</label>
        <input
          id="share-cost-basis"
          type="number"
          value={costBasisPerShare}
          onChange={(e) => setCostBasisPerShare(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Enter cost basis per share"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="share-purchase-date">Transaction Date:</label>
        <input
          id="share-purchase-date"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          required
        />
      </div>
      <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="submit-button">
          Add Purchase Transaction
        </button>
      </div>
    </form>
  );
};
