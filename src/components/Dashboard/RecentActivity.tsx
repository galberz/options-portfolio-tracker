import React from 'react';
import { useTrades } from '../../hooks/useTrades';

/**
 * Shows the five most recent trades from the transaction log.
 */
const RecentActivity: React.FC = () => {
  const trades = useTrades();
  const recent = [...trades].slice(-5).reverse();

  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3>Recent Trades</h3>
      {recent.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {recent.map((t) => (
            <li key={t.id} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #e1e5ea', paddingBottom: '0.5rem' }}>
              <strong>{t.ticker.toUpperCase()}</strong> - {t.transactionType} on {t.date}
            </li>
          ))}
        </ul>
      ) : (
        <p>No trades logged yet.</p>
      )}
    </div>
  );
};

export default RecentActivity;
