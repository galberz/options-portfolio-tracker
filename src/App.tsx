import React, { useState, useMemo } from 'react';
import { PositionList } from './components/PositionList';
import { OptionForm } from './components/OptionForm';
import { ShareForm } from './components/ShareForm';
import { PLChart } from './components/PLChart';
import { usePortfolio } from './contexts/PortfolioContext';
import { calculatePortfolioPL, findCrossoverPoints } from './utils/calculations';
import { HelpModal } from './components/HelpModal';
import './App.css';
import './components/HelpModal.css';

// --- Constants ---
const DEFAULT_IV_PERCENT = 30;
const DEFAULT_RATE_PERCENT = 4;

function App() {
  const { portfolio } = usePortfolio();
  const [currentPrice, setCurrentPrice] = useState<number | ''>('');
  const [impliedVolatility, setImpliedVolatility] = useState<number | ''>(DEFAULT_IV_PERCENT);
  const [riskFreeRate, setRiskFreeRate] = useState<number | ''>(DEFAULT_RATE_PERCENT);

  // --- START: Add State for Benchmark ---
  const [benchmarkQuantity, setBenchmarkQuantity] = useState<number | ''>('');
  const [benchmarkCostBasis, setBenchmarkCostBasis] = useState<number | ''>('');
  // --- END: Add State for Benchmark ---

  // Add state for help text visibility
  const [showIvHelp, setShowIvHelp] = useState(false);
  const [showRateHelp, setShowRateHelp] = useState(false);
  const [showCrossoverHelp, setShowCrossoverHelp] = useState(false);

  // --- START: Add State for Help Modal ---
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  // --- END: Add State for Help Modal ---

  // Basic price range calculation (can be refined later)
  const priceRange = useMemo(() => {
     let minStrike = Infinity;
     let maxStrike = -Infinity; // Use -Infinity for max initial value
     let shareCosts: number[] = [];

     portfolio.options.forEach(opt => {
       minStrike = Math.min(minStrike, opt.strikePrice);
       maxStrike = Math.max(maxStrike, opt.strikePrice);
     });
     portfolio.shares.forEach(share => {
        shareCosts.push(share.costBasisPerShare);
     });

     let low: number;
     let high: number;
     const hasOptions = portfolio.options.length > 0;
     const hasShares = portfolio.shares.length > 0;

     if (hasOptions) {
         const rangePadding = (maxStrike - minStrike) * 0.4 || 30; // 40% padding or $30
         low = minStrike - rangePadding;
         high = maxStrike + rangePadding;
         // Also consider share costs if they fall outside the strike range
         shareCosts.forEach(cost => {
             low = Math.min(low, cost * 0.8); // Include 80% of share cost
             high = Math.max(high, cost * 1.2); // Include 120% of share cost
         });

     } else if (hasShares) {
         const avgCost = shareCosts.reduce((sum, cost) => sum + cost, 0) / shareCosts.length;
         const rangePadding = avgCost * 0.3 || 30; // 30% padding or $30
         low = avgCost - rangePadding;
         high = avgCost + rangePadding;
     } else {
         // Default if portfolio is empty
         low = 0;
         high = 100;
     }

     // Ensure range is reasonable (e.g., not negative, min width)
     low = Math.max(0, low);
     high = Math.max(low + 20, high); // Ensure at least $20 width

     // Apply Rounding
     const finalRange = {
       low: Math.floor(low / 10) * 10, // Round down to nearest 10
       high: Math.ceil(high / 10) * 10, // Round up to nearest 10
     };

     console.log('[App.tsx] Calculated Rounded Price Range:', finalRange);
     return finalRange;
  }, [portfolio]);

  // --- START: Add State for Manual Chart Range ---
  const [chartRangeStart, setChartRangeStart] = useState<number | ''>(() => priceRange.low);
  const [chartRangeEnd, setChartRangeEnd] = useState<number | ''>(() => priceRange.high);
  // --- END: Add State for Manual Chart Range ---

  // Convert state percentages to decimals for calculations
  const ivDecimal = useMemo(() => (impliedVolatility === '' ? (DEFAULT_IV_PERCENT / 100) : Number(impliedVolatility) / 100), [impliedVolatility]);
  const rateDecimal = useMemo(() => (riskFreeRate === '' ? (DEFAULT_RATE_PERCENT / 100) : Number(riskFreeRate) / 100), [riskFreeRate]);

  // Calculate P/L whenever portfolio, price, IV, or Rate changes
  const currentPL = useMemo(() => {
    if (currentPrice === '' || isNaN(Number(currentPrice))) {
      return 0;
    }
    return calculatePortfolioPL(portfolio, Number(currentPrice), new Date(), ivDecimal, rateDecimal);
  }, [portfolio, currentPrice, ivDecimal, rateDecimal]);

  // Calculate crossover points whenever relevant inputs change
  const crossoverPoints = useMemo(() => {
    const qty = benchmarkQuantity === '' ? 0 : Number(benchmarkQuantity);
    const cost = benchmarkCostBasis === '' ? -1 : Number(benchmarkCostBasis);
    const start = chartRangeStart === '' ? 0 : Number(chartRangeStart);
    const end = chartRangeEnd === '' ? start + 100 : Number(chartRangeEnd);

    // Only calculate if benchmark is valid and price range exists
    if (qty > 0 && cost >= 0 && start < end) {
      return findCrossoverPoints(portfolio, qty, cost, start, end);
    }
    return []; // Return empty if benchmark not valid
  }, [portfolio, benchmarkQuantity, benchmarkCostBasis, chartRangeStart, chartRangeEnd]);

  const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setCurrentPrice(value === '' ? '' : Number(value));
    }
  };

  const handleIVChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '' || (/^[0-9]*\.?[0-9]*$/.test(value) && Number(value) >= 0)) {
      setImpliedVolatility(value === '' ? '' : Number(value));
    }
  };

  const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '' || (/^[0-9]*\.?[0-9]*$/.test(value) && Number(value) >= 0)) {
      setRiskFreeRate(value === '' ? '' : Number(value));
    }
  };

  // --- START: Add Handlers for Benchmark ---
  const handleBenchmarkQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      // Allow empty or positive numbers (including decimals for potential future use, though whole shares are common for benchmarks)
      if (value === '' || (/^[0-9]*\.?[0-9]*$/.test(value) && Number(value) >= 0)) {
          setBenchmarkQuantity(value === '' ? '' : Number(value));
      }
  };

  const handleBenchmarkCostBasisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      // Allow empty or positive numbers (decimals needed for price)
      if (value === '' || (/^[0-9]*\.?[0-9]*$/.test(value) && Number(value) >= 0)) {
          setBenchmarkCostBasis(value === '' ? '' : Number(value));
      }
  };
  // --- END: Add Handlers for Benchmark ---

  // --- START: Add Handlers for Chart Range ---
  const handleRangeStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setChartRangeStart(value === '' ? '' : Number(value));
    }
  };

  const handleRangeEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setChartRangeEnd(value === '' ? '' : Number(value));
    }
  };
  // --- END: Add Handlers for Chart Range ---

  console.log('[App.tsx] Rendering with priceRange:', priceRange);
  return (
    <div className="app-container">
      <h1>Options Portfolio Tracker</h1>
      <p>Welcome! Let's track some options.</p>

      <div className="current-status">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: '1rem' }}>
             {/* Wrap H2 and Button */}
            <h2>Current Status & P/L Curve</h2>
            {/* --- START: Add Help Button --- */}
            <button onClick={() => setIsHelpModalOpen(true)} className="help-button" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9em' }}>
                Explain Chart (?)
            </button>
            {/* --- END: Add Help Button --- */}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: '1 1 150px', marginBottom: '0' }}>
            <label htmlFor="current-price">Current Price ($):</label>
            <input
              id="current-price"
              type="text"
              inputMode="decimal"
              value={currentPrice}
              onChange={handlePriceChange}
              placeholder="e.g., 300.50"
              style={{ marginBottom: '0' }}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 100px', marginBottom: '0' }}>
            <label htmlFor="current-iv">
              Implied Vol. (%):
              <span className="help-toggle" onClick={() => setShowIvHelp(!showIvHelp)}>(?)</span>
            </label>
            <input
              id="current-iv"
              type="text"
              inputMode="decimal"
              value={impliedVolatility}
              onChange={handleIVChange}
              placeholder={`${DEFAULT_IV_PERCENT}`}
              style={{ marginBottom: '0' }}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 100px', marginBottom: '0' }}>
            <label htmlFor="current-rate">
              Risk-Free Rate (%):
              <span className="help-toggle" onClick={() => setShowRateHelp(!showRateHelp)}>(?)</span>
            </label>
            <input
              id="current-rate"
              type="text"
              inputMode="decimal"
              value={riskFreeRate}
              onChange={handleRateChange}
              placeholder={`${DEFAULT_RATE_PERCENT}`}
              style={{ marginBottom: '0' }}
            />
          </div>
          {/* --- START: Add Chart Range Inputs --- */}
          <div className="form-group" style={{ flex: '1 1 100px', marginBottom: '0' }}>
            <label htmlFor="range-start">Chart Min ($):</label>
            <input
              id="range-start"
              type="text"
              inputMode="decimal"
              value={chartRangeStart}
              onChange={handleRangeStartChange}
              placeholder="Min Price"
              style={{ marginBottom: '0' }}
            />
          </div>
          <div className="form-group" style={{ flex: '1 1 100px', marginBottom: '0' }}>
            <label htmlFor="range-end">Chart Max ($):</label>
            <input
              id="range-end"
              type="text"
              inputMode="decimal"
              value={chartRangeEnd}
              onChange={handleRangeEndChange}
              placeholder="Max Price"
              style={{ marginBottom: '0' }}
            />
          </div>
          {/* --- END: Add Chart Range Inputs --- */}
        </div>

        {/* Help text paragraphs moved outside the flex container */}
        {showIvHelp && (
          <p className="help-text" style={{marginBottom: '0.5rem'}}>
            Implied Volatility (IV) reflects the market's expectation of future price swings. Higher IV increases the theoretical option price (time value). Enter as a percentage (e.g., 30 for 30%).
          </p>
        )}
        {showRateHelp && (
          <p className="help-text" style={{marginBottom: '0.5rem'}}>
            The theoretical return of a risk-free investment (like government bonds). It has a minor effect on option prices. Enter as an annual percentage (e.g., 4 for 4%).
          </p>
        )}

        <details style={{ marginBottom: '1rem', border: '1px solid #eee', padding: '0.5rem', borderRadius: '4px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Benchmark: Buy & Hold</summary>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <div className="form-group" style={{ flex: '1 1 100px', marginBottom: '0' }}>
                    <label htmlFor="benchmark-qty">Hold Quantity:</label>
                    <input
                        id="benchmark-qty"
                        type="text" // Use text for flexible input
                        inputMode="numeric" // Hint for integer, but allow decimals if logic handles it
                        value={benchmarkQuantity}
                        onChange={handleBenchmarkQuantityChange}
                        placeholder="e.g., 200"
                        style={{ marginBottom: '0' }}
                    />
                </div>
                <div className="form-group" style={{ flex: '1 1 150px', marginBottom: '0' }}>
                    <label htmlFor="benchmark-cost">Hold Cost Basis ($/Share):</label>
                    <input
                        id="benchmark-cost"
                        type="text" // Use text for flexible input
                        inputMode="decimal"
                        value={benchmarkCostBasis}
                        onChange={handleBenchmarkCostBasisChange}
                        placeholder="e.g., 290.00"
                         style={{ marginBottom: '0' }}
                    />
                </div>
            </div>
        </details>

        <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <span>
            Current Theoretical P/L:
            <strong style={{ color: currentPL >= 0 ? 'green' : 'red', marginLeft: '5px' }}>
              {currentPrice !== '' ? `$${currentPL.toFixed(2)}` : 'Enter price'}
            </strong>
            {currentPrice !== '' && (
              <small style={{ marginLeft: '10px', color: '#555' }}>
                (using IV: {impliedVolatility === '' ? DEFAULT_IV_PERCENT : impliedVolatility}%, Rate: {riskFreeRate === '' ? DEFAULT_RATE_PERCENT : riskFreeRate}%)
              </small>
            )}
          </span>
        </div>

        {/* Display Crossover Points */}
        {(benchmarkQuantity !== '' && Number(benchmarkQuantity) > 0 && benchmarkCostBasis !== '' && Number(benchmarkCostBasis) >= 0) && (
          <div style={{ marginBottom: '1rem' }}>
            {/* Persistent Label & Toggle */}
            <div style={{ fontSize: '0.9em', color: '#333', marginBottom: '0.25rem' }}>
              Crossover vs Benchmark:
              <span className="help-toggle" onClick={() => setShowCrossoverHelp(!showCrossoverHelp)}>(?)</span>
            </div>

            {/* Conditional Help Text */}
            {showCrossoverHelp && (
              <p className="help-text" style={{ marginBottom: '0.5rem' }}>
                This shows the estimated underlying price(s) where your current strategy's P/L (using the green **Expiration P/L** curve) equals the benchmark P/L.
                Multiple crossover points are possible because options create non-linear payoff profiles.
                The regions between/outside these points indicate where one strategy is calculated to be more profitable than the other at expiration.
              </p>
            )}

            {/* Display calculated points OR "not found" message */}
            <div style={{ fontSize: '0.9em', paddingLeft: '1rem' }}>
              {crossoverPoints.length > 0 ? (
                <strong style={{ color: '#333' }}>
                  Approx. Price(s): {crossoverPoints.map(p => `$${p.toFixed(2)}`).join(', ')}
                </strong>
              ) : (
                <span style={{ color: '#555' }}>
                  There are no crossover points found within the current price range.
                </span>
              )}
            </div>
          </div>
        )}

        <PLChart
          portfolio={portfolio}
          currentPrice={currentPrice}
          rangeStart={chartRangeStart === '' ? 0 : Number(chartRangeStart)}
          rangeEnd={chartRangeEnd === '' ? (chartRangeStart === '' ? 100 : Number(chartRangeStart) + 100) : Number(chartRangeEnd)}
          impliedVolatility={ivDecimal}
          riskFreeRate={rateDecimal}
          benchmarkQuantity={benchmarkQuantity === '' ? 0 : Number(benchmarkQuantity)}
          benchmarkCostBasis={benchmarkCostBasis === '' ? 0 : Number(benchmarkCostBasis)}
        />
      </div>

      {/* Add forms for entry */}
      <div className="forms-container" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
             <ShareForm />
          </div>
          <div style={{ flex: 1, minWidth: '300px' }}>
             <OptionForm />
          </div>
      </div>

      {/* Display the current positions */}
      <PositionList />

      {/* --- START: Render Modal Conditionally --- */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
      {/* --- END: Render Modal Conditionally --- */}

    </div>
  );
}

export default App;
