import React from 'react';
import { usePerformanceMetrics } from '../../hooks/usePerformanceMetrics';

/**
 * Displays high level portfolio metrics like total P/L and success rate.
 */
const PerformanceCards: React.FC = () => {
  const { totalPL, successRate } = usePerformanceMetrics();

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <div style={{ flex: '1 1 150px', padding: '1rem', border: '1px solid #e1e5ea', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0 }}>Total P/L</h3>
        <p style={{ fontWeight: 600, color: totalPL >= 0 ? 'green' : 'red' }}>
          ${totalPL.toFixed(2)}
        </p>
      </div>
      <div style={{ flex: '1 1 150px', padding: '1rem', border: '1px solid #e1e5ea', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0 }}>Success Rate</h3>
        <p style={{ fontWeight: 600 }}>{(successRate * 100).toFixed(2)}%</p>
      </div>
    </div>
  );
};

export default PerformanceCards;
