import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { OptionPosition, OptionType, PositionType } from '../types/portfolio';

export const OptionForm: React.FC = () => {
  const {
    addOption,
    portfolio,
    editingPositionId,
    editingPositionType,
    updateOption,
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
    if (isEditMode && editingPositionId) {
      const optionToEdit = portfolio.options.find(o => o.id === editingPositionId);
      if (optionToEdit) {
        setTicker(optionToEdit.ticker);
        setQuantity(optionToEdit.quantity);
        setStrikePrice(optionToEdit.strikePrice);
        setPremium(optionToEdit.premium);
        setExpirationDate(optionToEdit.expirationDate);
        setTradeDate(optionToEdit.tradeDate);
        setOptionType(optionToEdit.optionType);
        setPositionType(optionToEdit.positionType);
      } else {
        console.warn(`Option with ID ${editingPositionId} not found for editing.`);
        cancelEditing();
      }
    } else {
      setTicker('');
      setQuantity('');
      setStrikePrice('');
      setPremium('');
      setExpirationDate('');
      setTradeDate('');
      setOptionType('call');
      setPositionType('short');
    }
  }, [isEditMode, editingPositionId, portfolio, cancelEditing]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticker || quantity === '' || strikePrice === '' || premium === '' || !expirationDate || !tradeDate) {
      alert('Please fill in all option fields.');
      return;
    }

    const optionData: Omit<OptionPosition, 'id'> = {
      ticker: ticker.toUpperCase(),
      quantity: Number(quantity),
      strikePrice: Number(strikePrice),
      premium: Number(premium),
      expirationDate: expirationDate,
      tradeDate: tradeDate,
      optionType: optionType,
      positionType: positionType,
    };

    if (isEditMode && editingPositionId) {
      updateOption(editingPositionId, optionData);
    } else {
      addOption(optionData);
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
        <label htmlFor="option-premium">Total Premium / Contract ($):</label>
        <input
          id="option-premium"
          type="number"
          value={premium}
          onChange={(e) => setPremium(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={positionType === 'short' ? "e.g., 150.50 (Received)" : "e.g., 150.50 (Paid)"}
          min="0"
          step="0.01"
          required
        />
        <small>{positionType === 'short' ? 'Enter the TOTAL premium received per contract.' : 'Enter the TOTAL premium paid per contract.'}</small>
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