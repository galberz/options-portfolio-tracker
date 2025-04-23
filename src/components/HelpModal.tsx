import React from 'react';
import './HelpModal.css'; // We will create this CSS file next

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void; // Function to call when closing the modal
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  // Don't render the modal if it's not open
  if (!isOpen) {
    return null;
  }

  // Prevent clicks inside the modal content from closing it
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    // Modal Overlay: Covers the screen, clicking closes modal
    <div className="modal-overlay" onClick={onClose}>
      {/* Modal Content Box: Centered, click inside doesn't close */}
      <div className="modal-content" onClick={handleContentClick}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>
          &times; {/* Simple 'X' symbol */}
        </button>

        {/* --- Explanatory Content --- */}
        <h2>Understanding the P/L Chart & Concepts</h2>

        <section>
          <h3>Why This Tool?</h3>
          <p>
            Options strategies involving shares, calls, puts, and assignments can be complex. It's often hard to grasp your true Profit/Loss potential or how your active trading compares to simpler strategies like just holding stock. This tool aims to clarify that by visualizing your potential outcomes based on the underlying asset's price. It helps analyze scenarios like covered calls being assigned, using puts to acquire shares, or holding multi-leg option positions.
          </p>
        </section>

        <section>
          <h3>The P/L Chart Lines</h3>
          <p>The chart shows your entire portfolio's P/L (Y-axis) at different Underlying Prices (X-axis).</p>
          <ul>
            <li>
              <strong>Expiration P/L (Green Line):</strong> Shows your calculated P/L exactly *at the moment the options expire*. It assumes all 'time value' is gone, and options are only worth their *intrinsic value* (how much they are in-the-money). This line often has sharp "kinks" at strike prices and reveals the fundamental payoff structure of your strategy if held to the end.
            </li>
            <li>
              <strong>Theoretical P/L (Purple Line):</strong> Shows your calculated P/L *now* (using today's date, or the date implied by time to expiration), assuming the underlying price instantly changed to the value on the X-axis. It uses the Black-Scholes model, which includes **time value**. Time value is influenced by Time to Expiration, **Implied Volatility (IV)**, and Risk-Free Rate (Rf). Higher IV generally increases time value. As expiration approaches, this line will converge towards the green line (all else being equal). It helps understand the current "mark-to-market" value and sensitivity to IV/time.
            </li>
            <li>
              <strong>Benchmark P/L (Dashed Line):</strong> Shows the P/L of the simple "Buy and Hold" scenario you defined in the Benchmark inputs (e.g., holding 200 shares @ $290). It's a straight line useful for comparing your active strategy's performance against "doing nothing".
            </li>
          </ul>
        </section>

         <section>
            <h3>Crossover Points</h3>
            <p>
                This shows the estimated underlying price(s) where your current strategy's P/L (using the green **Expiration P/L** curve) equals the benchmark P/L. Multiple crossover points are possible because options create non-linear payoff profiles, unlike the linear benchmark. The regions between/outside these points indicate the price ranges where one strategy is calculated to be more profitable than the other *at expiration*.
            </p>
         </section>

        <section>
          <h3>Key Parameters</h3>
          <ul>
            <li><strong>Implied Volatility (IV %):</strong> Reflects the market's expectation of *future price swings*. Higher IV means the market expects bigger moves, which increases the theoretical time value of options (making them more expensive to buy / more valuable to sell).</li>
            <li><strong>Risk-Free Rate (%):</strong> The theoretical return of a zero-risk investment (like government bonds). Used in pricing models for the time value of money and carrying costs. Usually has a much smaller impact on option prices than IV or time remaining.</li>
          </ul>
        </section>

        <button onClick={onClose} style={{ marginTop: '1rem' }}>
          Close
        </button>
      </div>
    </div>
  );
}; 