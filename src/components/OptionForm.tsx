import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { OptionType, PositionType } from '../types/portfolio';
import { TransactionType } from '../types/trades';

export const OptionForm: React.FC = () => {
  const {
    addTransaction,
    editingPositionId,
    editingPositionType,
    cancelEditing
  } = usePortfolio();

  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [strikePrice, setStrikePrice] = useState<number | ''>('');
  const [premium, setPremium] = useState<number | ''>('');
  const [expirationDate, setExpirationDate] = useState('');
  const [tradeDate, setTradeDate] = useState('');
  const [optionType, setOptionType] = useState<OptionType>('call');
  const [positionType, setPositionType] = useState<PositionType>('short');

  const isEditMode = useMemo(() => {
    return editingPositionType === 'option' && editingPositionId !== null;
  }, [editingPositionId, editingPositionType]);

  useEffect(() => {
    if (!isEditMode) {
      setTicker("");
      setQuantity("");
      setStrikePrice("");
      setPremium("");
      setExpirationDate("");
      setTradeDate("");
      setOptionType("call");
      setPositionType("short");
    }
  }, [isEditMode]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticker || quantity === '' || strikePrice === '' || premium === '' || !expirationDate || !tradeDate) {
      alert('Please fill in all option fields.');
      return;
    }

    const optionId = `${ticker}_${optionType}_${strikePrice}_${expirationDate}`;

    const transactionData = {
      date: tradeDate,
      ticker: ticker.toUpperCase(),
      transactionType: positionType === 'short' ? TransactionType.SELL_TO_OPEN_OPTION : TransactionType.BUY_TO_OPEN_OPTION,
      quantity: Number(quantity),
      optionType,
      strikePrice: Number(strikePrice),
      premiumPerContract: Number(premium),
      expirationDate,
      optionId,
      commission: 0,
    };

    if (isEditMode && editingPositionId) {
      console.warn("Attempted to save in edit mode, but editing is disabled for OptionForm.");
    } else {
      addTransaction(transactionData);
      setTicker('');
      setQuantity('');
      setStrikePrice('');
      setPremium('');
      setExpirationDate('');
      setTradeDate('');
      setOptionType('call');
      setPositionType('short');
    }
  };

  const handleCancel = () => {
    cancelEditing();
  };

  return (
    <form onSubmit={handleSubmit} className="position-form">
      <h3>{isEditMode ? 'Edit Option Position' : 'Add Option Position'}</h3>
      <div className="form-group">
        <label htmlFor="option-ticker">Ticker:</label>
        <input
          id="option-ticker"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="e.g., MSFT"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="option-type">Type:</label>
        <select
          id="option-type"
          value={optionType}
          onChange={(e) => setOptionType(e.target.value as OptionType)}
          required
        >
          <option value="call">Call</option>
          <option value="put">Put</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="option-position-type">Position:</label>
        <select
          id="option-position-type"
          value={positionType}
          onChange={(e) => setPositionType(e.target.value as PositionType)}
          required
        >
          <option value="short">Short (Sold)</option>
          <option value="long">Long (Bought)</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="option-quantity">Quantity (Contracts):</label>
        <input
          id="option-quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="e.g., 1"
          min="1"
          step="1"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="option-strike">Strike Price ($):</label>
        <input
          id="option-strike"
          type="number"
          value={strikePrice}
          onChange={(e) => setStrikePrice(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="e.g., 300"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="option-premium">
            TOTAL Premium / Contract ($): {/* Emphasize TOTAL */}
        </label>
        <input
          id="option-premium"
          type="number"
          value={premium}
          onChange={(e) => setPremium(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={positionType === 'short' ? "e.g., 800.00 (Total Received)" : "e.g., 1345.00 (Total Paid)"}
          min="0"
          step="0.01"
          required
        />
        <small>
            Enter the TOTAL dollar amount paid (long) or received (short) for ONE single contract. Example: If the premium was quoted as $13.45 per share, you should enter <strong>1345</strong> here (i.e., $13.45 x 100).
        </small>
      </div>
      <div className="form-group">
        <label htmlFor="option-trade-date">Trade Date:</label>
        <input
          id="option-trade-date"
          type="date"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="option-expiration">Expiration Date:</label>
        <input
          id="option-expiration"
          type="date"
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
          required
        />
      </div>
      <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="submit-button">
          {isEditMode ? 'Save Changes' : 'Add Option'}
        </button>
        {isEditMode && (
          <button type="button" onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}; 