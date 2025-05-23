import React from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { SharePosition, OptionPosition } from '../types/portfolio';
import './PositionList.css'; // We'll create this CSS file next

// Sub-component to display a single share row
const ShareRow: React.FC<{
  share: SharePosition;
}> = ({ share }) => (
  <tr>
    <td>{share.ticker.toUpperCase()}</td>
    <td>{share.quantity.toFixed(4)}</td>
    <td>${share.costBasisPerShare.toFixed(2)}</td>
    <td>{share.purchaseDate}</td>
  </tr>
);

// Sub-component to display a single option row
const OptionRow: React.FC<{
  option: OptionPosition;
}> = ({ option }) => (
  <tr>
    <td>{option.ticker.toUpperCase()}</td>
    <td>{option.quantity}</td>
    <td>{option.optionType.toUpperCase()}</td>
    <td>{option.positionType.toUpperCase()}</td>
    <td>${option.strikePrice.toFixed(2)}</td>
    <td>${option.premium.toFixed(2)}</td>
    <td>{option.tradeDate}</td>
    <td>{option.expirationDate}</td>
  </tr>
);

// Main component to display both lists
export const PositionList: React.FC = () => {
  const { processedPortfolio } = usePortfolio();
  const openShares = processedPortfolio?.openShares || [];
  const openOptions = processedPortfolio?.openOptions || [];
  
  // --- Log the received options ---
  console.log('[PositionList] Received processedPortfolio.openOptions:', openOptions);
  // --- End Log ---

  return (
    <div className="position-list-container">
      <h2>Share Positions</h2>
      {openShares.length > 0 ? (
        <table className="position-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Quantity</th>
              <th>Cost/Share</th>
              <th>Purchase Date</th>
            </tr>
          </thead>
          <tbody>
            {openShares.map((share) => (
              <ShareRow
                key={share.id}
                share={share}
              />
            ))}
          </tbody>
        </table>
      ) : (
        <p>No share positions entered yet.</p>
      )}

      <h2>Option Positions</h2>
      {openOptions.length > 0 ? (
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
            </tr>
          </thead>
          <tbody>
            {openOptions.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
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