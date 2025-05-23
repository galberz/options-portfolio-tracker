import React, { useState, useEffect } from 'react';
import { useTrades } from '../../hooks/useTrades';
import { OptionType } from '../../types/portfolio';
import { TransactionType, Transaction } from '../../types/trades';

// Simple form to enter different trade types
export const TradeForm: React.FC = () => {
  const { addTrade } = useTrades();

  type Category = 'stock' | 'option' | 'assignment';
  const [category, setCategory] = useState<Category>('stock');

  const [ticker, setTicker] = useState('');
  const [date, setDate] = useState('');

  // stock fields
  const [stockType, setStockType] = useState<TransactionType>(TransactionType.BUY_SHARE);
  const [shareQty, setShareQty] = useState<number | ''>('');
  const [pricePerShare, setPricePerShare] = useState<number | ''>('');

  // option fields
  const [optionTxType, setOptionTxType] = useState<TransactionType>(TransactionType.SELL_TO_OPEN_OPTION);
  const [optionType, setOptionType] = useState<OptionType>('call');
  const [contracts, setContracts] = useState<number | ''>('');
  const [strikePrice, setStrikePrice] = useState<number | ''>('');
  const [premium, setPremium] = useState<number | ''>('');
  const [expiration, setExpiration] = useState('');
  const [optionId, setOptionId] = useState('');

  // assignment fields
  const [assignmentType, setAssignmentType] = useState<TransactionType>(TransactionType.OPTION_ASSIGNED);
  const [assignContracts, setAssignContracts] = useState<number | ''>('');
  const [assignStrike, setAssignStrike] = useState<number | ''>('');
  const [assignOptionId, setAssignOptionId] = useState('');

  // Generate optionId automatically when key fields change
  useEffect(() => {
    if (ticker && strikePrice !== '' && expiration) {
      setOptionId(`${ticker}_${optionType}_${strikePrice}_${expiration}`);
    }
  }, [ticker, optionType, strikePrice, expiration]);

  const resetFields = () => {
    setTicker('');
    setDate('');
    setShareQty('');
    setPricePerShare('');
    setOptionType('call');
    setOptionTxType(TransactionType.SELL_TO_OPEN_OPTION);
    setContracts('');
    setStrikePrice('');
    setPremium('');
    setExpiration('');
    setOptionId('');
    setAssignmentType(TransactionType.OPTION_ASSIGNED);
    setAssignContracts('');
    setAssignStrike('');
    setAssignOptionId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !date) {
      alert('Ticker and date are required');
      return;
    }

    if (category === 'stock') {
      if (shareQty === '' || pricePerShare === '') {
        alert('Enter share quantity and price');
        return;
      }
      addTrade({
        ticker: ticker.toUpperCase(),
        date,
        transactionType: stockType,
        quantity: Number(shareQty),
        pricePerShare: Number(pricePerShare),
        commission: 0,
      } as Omit<Transaction, 'id'>);
    } else if (category === 'option') {
      if (contracts === '' || strikePrice === '' || premium === '' || !expiration) {
        alert('Fill all option fields');
        return;
      }
      addTrade({
        ticker: ticker.toUpperCase(),
        date,
        transactionType: optionTxType,
        optionType,
        strikePrice: Number(strikePrice),
        expirationDate: expiration,
        quantity: Number(contracts),
        premiumPerContract: Number(premium),
        optionId: optionId || `${ticker}_${optionType}_${strikePrice}_${expiration}`,
        commission: 0,
      } as Omit<Transaction, 'id'>);
    } else {
      if (assignContracts === '' || assignStrike === '' || !assignOptionId) {
        alert('Fill all assignment fields');
        return;
      }
      addTrade({
        ticker: ticker.toUpperCase(),
        date,
        transactionType: assignmentType,
        quantity: Number(assignContracts),
        strikePrice: Number(assignStrike),
        optionId: assignOptionId,
      } as Omit<Transaction, 'id'>);
    }

    resetFields();
  };

  return (
    <form onSubmit={handleSubmit} className="position-form">
      <h3>Log Trade</h3>
      <div className="form-group">
        <label htmlFor="trade-category">Category:</label>
        <select id="trade-category" value={category} onChange={e => setCategory(e.target.value as Category)}>
          <option value="stock">Stock</option>
          <option value="option">Option</option>
          <option value="assignment">Assignment/Exercise</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="trade-ticker">Ticker:</label>
        <input id="trade-ticker" type="text" value={ticker} onChange={e => setTicker(e.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="trade-date">Date:</label>
        <input id="trade-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </div>

      {category === 'stock' && (
        <>
          <div className="form-group">
            <label htmlFor="stock-type">Type:</label>
            <select id="stock-type" value={stockType} onChange={e => setStockType(e.target.value as TransactionType)}>
              <option value={TransactionType.BUY_SHARE}>Buy</option>
              <option value={TransactionType.SELL_SHARE}>Sell</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="stock-qty">Quantity:</label>
            <input id="stock-qty" type="number" value={shareQty} onChange={e => setShareQty(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="stock-price">Price/Share:</label>
            <input id="stock-price" type="number" value={pricePerShare} onChange={e => setPricePerShare(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </>
      )}

      {category === 'option' && (
        <>
          <div className="form-group">
            <label htmlFor="option-txtype">Transaction:</label>
            <select id="option-txtype" value={optionTxType} onChange={e => setOptionTxType(e.target.value as TransactionType)}>
              <option value={TransactionType.SELL_TO_OPEN_OPTION}>Sell to Open</option>
              <option value={TransactionType.BUY_TO_OPEN_OPTION}>Buy to Open</option>
              <option value={TransactionType.BUY_TO_CLOSE_OPTION}>Buy to Close</option>
              <option value={TransactionType.SELL_TO_CLOSE_OPTION}>Sell to Close</option>
              <option value={TransactionType.OPTION_EXPIRED}>Expired</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="option-type">Type:</label>
            <select id="option-type" value={optionType} onChange={e => setOptionType(e.target.value as OptionType)}>
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="option-contracts">Contracts:</label>
            <input id="option-contracts" type="number" value={contracts} onChange={e => setContracts(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="option-strike">Strike Price:</label>
            <input id="option-strike" type="number" value={strikePrice} onChange={e => setStrikePrice(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="option-premium">Premium/Contract:</label>
            <input id="option-premium" type="number" value={premium} onChange={e => setPremium(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="option-expiration">Expiration:</label>
            <input id="option-expiration" type="date" value={expiration} onChange={e => setExpiration(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="option-id">Option ID:</label>
            <input id="option-id" type="text" value={optionId} onChange={e => setOptionId(e.target.value)} />
          </div>
        </>
      )}

      {category === 'assignment' && (
        <>
          <div className="form-group">
            <label htmlFor="assign-type">Type:</label>
            <select id="assign-type" value={assignmentType} onChange={e => setAssignmentType(e.target.value as TransactionType)}>
              <option value={TransactionType.OPTION_ASSIGNED}>Assigned (Short)</option>
              <option value={TransactionType.OPTION_EXERCISED}>Exercised (Long)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="assign-contracts">Contracts:</label>
            <input id="assign-contracts" type="number" value={assignContracts} onChange={e => setAssignContracts(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="assign-strike">Strike Price:</label>
            <input id="assign-strike" type="number" value={assignStrike} onChange={e => setAssignStrike(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="assign-option-id">Option ID:</label>
            <input id="assign-option-id" type="text" value={assignOptionId} onChange={e => setAssignOptionId(e.target.value)} />
          </div>
        </>
      )}

      <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="submit-button">Add Trade</button>
      </div>
    </form>
  );
};
