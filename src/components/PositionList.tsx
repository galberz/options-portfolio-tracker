import React from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { SharePosition, OptionPosition } from '../types/portfolio';
import './PositionList.css'; // We'll create this CSS file next

// Sub-component to display a single share row
const ShareRow: React.FC<{
  share: SharePosition;
  onRemove: (id: string) => void;
  onEdit: (id: string, type: 'share' | 'option') => void;
}> = ({ share, onRemove, onEdit }) => (
  <tr>
    <td>{share.ticker.toUpperCase()}</td>
    <td>{share.quantity}</td>
    <td>${share.costBasisPerShare.toFixed(2)}</td>
    <td>{share.purchaseDate}</td>
    <td>
      <button
        onClick={() => onEdit(share.id, 'share')}
        className="edit-btn"
        style={{ marginRight: '5px' }}
      >
        Edit
      </button>
      <button onClick={() => onRemove(share.id)} className="remove-btn">X</button>
    </td>
  </tr>
);

// Sub-component to display a single option row
const OptionRow: React.FC<{
  option: OptionPosition;
  onRemove: (id: string) => void;
  onEdit: (id: string, type: 'share' | 'option') => void;
}> = ({ option, onRemove, onEdit }) => (
  <tr>
    <td>{option.ticker.toUpperCase()}</td>
    <td>{option.quantity}</td>
    <td>{option.optionType.toUpperCase()}</td>
    <td>{option.positionType.toUpperCase()}</td>
    <td>${option.strikePrice.toFixed(2)}</td>
    <td>${option.premium.toFixed(2)}</td>
    <td>{option.tradeDate}</td>
    <td>{option.expirationDate}</td>
    <td>
      <button
        onClick={() => onEdit(option.id, 'option')}
        className="edit-btn"
        style={{ marginRight: '5px' }}
      >
        Edit
      </button>
      <button onClick={() => onRemove(option.id)} className="remove-btn">X</button>
    </td>
  </tr>
);

// Main component to display both lists
export const PositionList: React.FC = () => {
  const { portfolio, removeShare, removeOption, startEditing } = usePortfolio();

  return (
    <div className="position-list-container">
      <h2>Share Positions</h2>
      {portfolio.shares.length > 0 ? (
        <table className="position-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Quantity</th>
              <th>Cost/Share</th>
              <th>Purchase Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.shares.map((share) => (
              <ShareRow
                key={share.id}
                share={share}
                onRemove={removeShare}
                onEdit={startEditing}
              />
            ))}
          </tbody>
        </table>
      ) : (
        <p>No share positions entered yet.</p>
      )}

      <h2>Option Positions</h2>
      {portfolio.options.length > 0 ? (
        <table className="position-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Contracts</th>
              <th>Type</th>
              <th>Position</th>
              <th>Strike</th>
              <th>Premium</th>
              <th>Trade Date</th>
              <th>Expiration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                onRemove={removeOption}
                onEdit={startEditing}
              />
            ))}
          </tbody>
        </table>
      ) : (
        <p>No option positions entered yet.</p>
      )}
    </div>
  );
}; 