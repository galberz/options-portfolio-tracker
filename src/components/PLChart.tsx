import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine // To mark current price
} from 'recharts';
import { Portfolio } from '../types/portfolio';
import { generatePLData, generateExpirationPLData, generateBenchmarkPLData } from '../utils/calculations';

interface PLChartProps {
  portfolio: Portfolio;
  currentPrice: number | ''; // To show a marker on the chart
  rangeStart: number;
  rangeEnd: number;
  steps?: number; // Optional number of steps for data generation
  impliedVolatility: number; // Expect decimal format from App
  riskFreeRate: number;      // Expect decimal format from App
  // --- START: Add Benchmark Props ---
  benchmarkQuantity: number;
  benchmarkCostBasis: number;
  // --- END: Add Benchmark Props ---
}

export const PLChart: React.FC<PLChartProps> = ({
  portfolio,
  currentPrice,
  rangeStart,
  rangeEnd,
  steps = 100,
  impliedVolatility,
  riskFreeRate,
  // --- START: Destructure Benchmark Props ---
  benchmarkQuantity,
  benchmarkCostBasis,
  // --- END: Destructure Benchmark Props ---
}) => {
  // Optional: Keep logs for now if you want to see data generation

  // Generate the data points for the THEORETICAL chart (existing)
  const theoreticalChartData = useMemo(() => {
    if (typeof rangeStart !== 'number' || typeof rangeEnd !== 'number' || rangeStart >= rangeEnd) {
        console.warn("[PLChart.tsx] Invalid range detected for theoretical data:", rangeStart, rangeEnd);
        return [];
    }
    const data = generatePLData(portfolio, rangeStart, rangeEnd, steps, new Date(), impliedVolatility, riskFreeRate);
    return data;
  }, [portfolio, rangeStart, rangeEnd, steps, impliedVolatility, riskFreeRate]);

  // --- START: ADD EXPIRATION DATA GENERATION ---
  // Generate the data points for the EXPIRATION chart
  const expirationChartData = useMemo(() => {
     if (typeof rangeStart !== 'number' || typeof rangeEnd !== 'number' || rangeStart >= rangeEnd) {
        console.warn("[PLChart.tsx] Invalid range detected for expiration data:", rangeStart, rangeEnd);
        return [];
    }
    // Use the new function for expiration P/L
    const data = generateExpirationPLData(portfolio, rangeStart, rangeEnd, steps);
    return data;
  }, [portfolio, rangeStart, rangeEnd, steps]);
  // --- END: ADD EXPIRATION DATA GENERATION ---

  // --- START: Generate Benchmark Data ---
  const benchmarkChartData = useMemo(() => {
    // Only generate if quantity is greater than 0
    if (benchmarkQuantity > 0 && benchmarkCostBasis >= 0) {
        const data = generateBenchmarkPLData(benchmarkQuantity, benchmarkCostBasis, rangeStart, rangeEnd, steps);
        return data;
    }
    return []; // Return empty array if benchmark not defined
  }, [benchmarkQuantity, benchmarkCostBasis, rangeStart, rangeEnd, steps]);
  // --- END: Generate Benchmark Data ---


  // Check if *either* dataset is empty, or maybe base it on theoretical for now
  const noData = theoreticalChartData.length === 0 && expirationChartData.length === 0 && benchmarkChartData.length === 0;

  if (noData) {
    return <p style={{ textAlign: 'center', margin: '20px' }}>Not enough data to display P/L chart.</p>;
  }

  // Format currency for tooltip/axis
  const formatCurrency = (value: number) => `$${value.toFixed(0)}`; // Simple formatting


  return (
    <div style={{ width: '100%', height: 400 }}> {/* Define chart container size */}
      <ResponsiveContainer>
        {/* Use the theoretical data as the primary source for the chart axes if needed, or let Recharts auto-adjust */}
        <LineChart
          // Consider merging data or letting Recharts handle multiple lines on shared axes
          // data={theoreticalChartData} // We might remove this if feeding data directly to Lines
          margin={{
            top: 20,
            right: 40, // Increased right margin for labels
            left: 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis
            dataKey="price"
            type="number"
            allowDuplicatedCategory={false} // Important when plotting multiple lines with same x-values
            domain={[rangeStart, rangeEnd]}
            label={{ value: "Underlying Price ($)", position: "insideBottom", dy: 10, fill: '#666' }}
            tickFormatter={(value) => `$${value}`}
            stroke="#666"
          />
          <YAxis
            tickFormatter={formatCurrency}
            label={{ value: "Profit / Loss ($)", angle: -90, position: "insideLeft", dx: -10, fill: '#666' }}
            stroke="#666"
            // Allow Recharts to determine the domain based on both datasets
             domain={['auto', 'auto']}
          />
          {/* Updated Tooltip to potentially show both P/L values if hovered */}
           <Tooltip
             formatter={(value, name) => {
               const formattedValue = formatCurrency(value as number);
               return [formattedValue, name];
             }}
             labelFormatter={(label) => `Price: $${Number(label).toFixed(2)}`}
           />
          <Legend verticalAlign="top" height={36}/>

          {/* Line representing THEORETICAL P/L (Black-Scholes) */}
          <Line
            type="monotone"
            data={theoreticalChartData} // Feed data directly to the line
            dataKey="pl"
            name="Theoretical P/L" // Updated name
            stroke="#8884d8" // Purple line
            strokeWidth={2}
            dot={false}
          />

          {/* --- START: ADD EXPIRATION P/L LINE --- */}
          {/* Line representing EXPIRATION P/L */}
          <Line
            type="monotone"
            data={expirationChartData} // Feed expiration data to this line
            dataKey="pl"
            name="Expiration P/L" // New name
            stroke="#82ca9d" // Green line for expiration
            strokeWidth={2}
            dot={false}
          />
          {/* --- END: ADD EXPIRATION P/L LINE --- */}

          {/* --- START: Add Benchmark Line --- */}
          {/* Only render if data exists */}
          {benchmarkChartData.length > 0 && (
              <Line
                  type="linear" // Benchmark is usually linear
                  data={benchmarkChartData}
                  dataKey="pl"
                  name="Benchmark P/L"
                  stroke="#555555" // Dark grey color
                  strokeWidth={1.5} // Slightly thinner?
                  strokeDasharray="5 5" // Dashed line
                  dot={false}
              />
          )}
          {/* --- END: Add Benchmark Line --- */}

          {/* Zero P/L line (breakeven) - remains the same */}
          <ReferenceLine y={0} stroke="#a8a8a8" strokeDasharray="4 4" label={{ value: 'Breakeven', position: 'insideTopRight', fill: '#888' }} />

          {/* Line marking the current price - remains the same */}
          {currentPrice !== '' && typeof currentPrice === 'number' && currentPrice >= rangeStart && currentPrice <= rangeEnd && (
            <ReferenceLine
              x={currentPrice}
              stroke="orange" // Changed color slightly to contrast with green/purple
              strokeWidth={2}
              label={{ value: `Current: $${currentPrice.toFixed(2)}`, position: 'insideTopLeft', fill: 'orange', dy: -5 }} // Adjusted dy
            />
          )}

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 