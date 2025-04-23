import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { SharePosition } from '../types/portfolio';

export const ShareForm: React.FC = () => {
  const {
    addShare,
    portfolio,
    editingPositionId,
    editingPositionType,
    updateShare,
    cancelEditing
  } = usePortfolio();

  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [costBasisPerShare, setCostBasisPerShare] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState('');

  const isEditMode = useMemo(() => {
    return editingPositionType === 'share' && editingPositionId !== null;
  }, [editingPositionId, editingPositionType]);

  useEffect(() => {
    if (isEditMode && editingPositionId) {
      const shareToEdit = portfolio.shares.find(s => s.id === editingPositionId);
      if (shareToEdit) {
        setTicker(shareToEdit.ticker);
        setQuantity(shareToEdit.quantity);
        setCostBasisPerShare(shareToEdit.costBasisPerShare);
        setPurchaseDate(shareToEdit.purchaseDate);
      } else {
        console.warn(`Share with ID ${editingPositionId} not found for editing.`);
        cancelEditing();
      }
    } else {
      setTicker('');
      setQuantity('');
      setCostBasisPerShare('');
      setPurchaseDate('');
    }
  }, [isEditMode, editingPositionId, portfolio, cancelEditing]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticker || quantity === '' || costBasisPerShare === '' || !purchaseDate) {
      alert('Please fill in all share fields.');
      return;
    }

    const shareData: Omit<SharePosition, 'id'> = {
      ticker: ticker.toUpperCase(),
      quantity: Number(quantity),
      costBasisPerShare: Number(costBasisPerShare),
      purchaseDate: purchaseDate,
    };

    if (isEditMode && editingPositionId) {
      updateShare(editingPositionId, shareData);
    } else {
      addShare(shareData);
      setTicker('');
      setQuantity('');
      setCostBasisPerShare('');
      setPurchaseDate('');
    }
  };

  const handleCancel = () => {
    cancelEditing();
  };

  return (
    <form onSubmit={handleSubmit} className="position-form">
      <h3>{isEditMode ? 'Edit Share Position' : 'Add Share Position'}</h3>
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
        <label htmlFor="share-cost-basis">Cost Basis per Share:</label>
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
        <label htmlFor="share-purchase-date">Purchase Date:</label>
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
          {isEditMode ? 'Save Changes' : 'Add Share Position'}
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