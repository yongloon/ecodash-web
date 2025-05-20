// src/lib/signals.ts
import { IndicatorMetadata, TimeSeriesDataPoint } from './indicators';

export type SignalSentiment = 'bullish' | 'bearish' | 'neutral' | 'mixed';

export interface IndicatorSignal {
  sentiment: SignalSentiment;
  message: string; // A brief explanation of the signal
  strength?: 'weak' | 'moderate' | 'strong'; // Optional strength
}

// Helper function to simplify number comparison
const compareValues = (current: number | null | undefined, previous: number | null | undefined): 'increase' | 'decrease' | 'samed' | 'nodata' => {
    if (current === null || current === undefined || previous === null || previous === undefined) return 'nodata';
    // Add a small tolerance for "samed" to avoid flagging tiny insignificant changes
    const tolerance = 0.001 * Math.abs(previous || 1); // 0.1% tolerance or based on previous value
    if (current > previous + tolerance) return 'increase';
    if (current < previous - tolerance) return 'decrease';
    return 'samed';
};

export function getIndicatorSignal(
  indicator: IndicatorMetadata,
  latestValue: TimeSeriesDataPoint | null,
  previousValue?: TimeSeriesDataPoint | null,
): IndicatorSignal | null {
  if (!latestValue || latestValue.value === null) {
    return { sentiment: 'neutral', message: 'Not enough data to determine a signal.' };
  }

  const currentValue = latestValue.value;
  const prevValue = previousValue?.value;
  const changeDirection = compareValues(currentValue, prevValue);
  const indicatorName = indicator.name.replace(' (USD)', '');


  switch (indicator.id) {
    // --- Category I: Economic Output & Growth ---
    case 'GDP_REAL': // Level
      if (changeDirection === 'increase') return { sentiment: 'bullish', message: `Real GDP is increasing, indicating economic growth.` };
      if (changeDirection === 'decrease') return { sentiment: 'bearish', message: `Real GDP is decreasing, indicating economic slowdown.` };
      return { sentiment: 'neutral', message: `Real GDP is stable.` };
    case 'GDP_GROWTH': // Rate
      if (currentValue > 3) return { sentiment: 'bullish', strength: 'strong', message: `Strong GDP growth (${currentValue}%) signals robust expansion.` };
      if (currentValue > 1.5) return { sentiment: 'bullish', message: `Positive GDP growth (${currentValue}%) suggests expansion.` };
      if (currentValue < 0) return { sentiment: 'bearish', strength: 'strong', message: `Negative GDP growth (${currentValue}%) signals economic contraction.` };
      if (currentValue < 1) return { sentiment: 'bearish', strength: 'weak', message: `Slow GDP growth (${currentValue}%) may indicate stagnation.` };
      return { sentiment: 'neutral', message: `GDP growth is moderate (${currentValue}%).` };
    case 'LEI':
      if (changeDirection === 'increase') return { sentiment: 'bullish', message: 'Leading Economic Index rising suggests future growth.' };
      if (changeDirection === 'decrease') return { sentiment: 'bearish', message: 'Leading Economic Index falling suggests potential slowdown.' };
      return { sentiment: 'neutral', message: 'Leading Economic Index is stable.' };

    // --- Category II: Labor Market ---
    case 'UNRATE':
      if (currentValue < 4.0 && changeDirection === 'decrease') return { sentiment: 'bullish', strength: 'strong', message: `Unemployment very low and falling (${currentValue}%). Strong labor market.` };
      if (changeDirection === 'decrease') return { sentiment: 'bullish', message: `Unemployment rate decreasing (${currentValue}%). Positive for labor market.` };
      if (currentValue > 5.5 && changeDirection === 'increase') return { sentiment: 'bearish', strength: 'strong', message: `Unemployment rising to concerning levels (${currentValue}%).` };
      if (changeDirection === 'increase') return { sentiment: 'bearish', message: `Unemployment rate increasing (${currentValue}%). Negative for labor market.` };
      return { sentiment: 'neutral', message: `Unemployment rate stable (${currentValue}%).` };
    case 'PAYEMS_MOM_CHG':
      if (currentValue > 250) return { sentiment: 'bullish', strength: 'strong', message: `Very strong job growth reported (${currentValue}k).` };
      if (currentValue > 100) return { sentiment: 'bullish', message: `Solid job growth (${currentValue}k).` };
      if (currentValue < 0) return { sentiment: 'bearish', strength: 'strong', message: `Job losses reported (${currentValue}k).` };
      if (currentValue < 50) return { sentiment: 'bearish', strength: 'weak', message: `Weak job growth (${currentValue}k).` };
      return { sentiment: 'neutral', message: `Moderate job growth (${currentValue}k).` };
    case 'AVGHRLY_YOY_PCT': // Wage Growth
      // Perspective: Moderate wage growth is good. Too high can be inflationary (bearish for markets). Too low is bad for consumers.
      if (currentValue > 4.5) return { sentiment: 'mixed', message: `High wage growth (${currentValue}%) could fuel inflation.` };
      if (currentValue > 3.0) return { sentiment: 'bullish', message: `Solid wage growth (${currentValue}%) supporting consumer spending.` };
      if (currentValue < 2.0) return { sentiment: 'bearish', message: `Low wage growth (${currentValue}%) may constrain consumer spending.` };
      return { sentiment: 'neutral', message: `Moderate wage growth (${currentValue}%).` };
    case 'JOBLESSCLAIMS': // Lower is better
      if (prevValue && currentValue < prevValue && currentValue < 220000) return { sentiment: 'bullish', strength: 'strong', message: `Jobless claims falling to low levels (${currentValue / 1000}k).` };
      if (changeDirection === 'decrease') return { sentiment: 'bullish', message: `Jobless claims decreasing (${currentValue / 1000}k).` };
      if (prevValue && currentValue > prevValue && currentValue > 280000) return { sentiment: 'bearish', strength: 'strong', message: `Jobless claims rising to concerning levels (${currentValue / 1000}k).` };
      if (changeDirection === 'increase') return { sentiment: 'bearish', message: `Jobless claims increasing (${currentValue / 1000}k).` };
      return { sentiment: 'neutral', message: `Jobless claims stable (${currentValue / 1000}k).` };

    // --- Category III: Inflation & Prices ---
    case 'CPI_YOY_PCT':
    case 'CORE_CPI_YOY_PCT':
    case 'PCE_YOY_PCT':
    case 'CORE_PCE_YOY_PCT':
      // Perspective: Target inflation is ~2%. High/rising is bearish for markets.
      if (currentValue > 4.0) return { sentiment: 'bearish', strength: 'strong', message: `High inflation (${currentValue}%) may prompt aggressive policy response.` };
      if (currentValue > 2.5 && changeDirection === 'increase') return { sentiment: 'bearish', message: `Inflation (${currentValue}%) rising above target.` };
      if (currentValue <= 2.5 && currentValue >= 1.5 && (changeDirection === 'decrease' || changeDirection === 'samed')) return { sentiment: 'bullish', message: `Inflation (${currentValue}%) near target and stable/falling.` };
      if (currentValue < 1.0) return { sentiment: 'mixed', message: `Very low inflation (${currentValue}%) could indicate weak demand (disinflation).` };
      return { sentiment: 'neutral', message: `Inflation at ${currentValue}%.` };
    case 'OIL_WTI':
      // Perspective: Rapidly rising oil can be inflationary and bad for consumers/businesses.
      if (changeDirection === 'increase' && prevValue && currentValue > prevValue * 1.10) return { sentiment: 'bearish', strength: 'moderate', message: `Oil prices rising sharply, potentially impacting inflation and growth.` };
      if (changeDirection === 'decrease' && prevValue && currentValue < prevValue * 0.90) return { sentiment: 'bullish', strength: 'moderate', message: `Oil prices falling significantly, may ease inflationary pressures.` };
      return { sentiment: 'neutral', message: `Oil price relatively stable.` };
    case 'GOLD_PRICE':
    case 'SILVER_PRICE': // Add SILVER_PRICE to share logic with GOLD_PRICE
        if (changeDirection === 'increase') return { sentiment: 'bullish', message: `${indicatorName} price increasing; often seen as safe haven or inflation hedge.`};
        if (changeDirection === 'decrease') return { sentiment: 'mixed', message: `${indicatorName} price decreasing; may indicate rising risk appetite or deflationary pressures.`};
        return { sentiment: 'neutral', message: `${indicatorName} price is stable.` };

    // --- Category IV: Consumer Activity ---
    case 'RETAIL_SALES_MOM_PCT':
      if (currentValue > 0.5) return { sentiment: 'bullish', strength: 'strong', message: `Strong retail sales growth (${currentValue}% MoM).` };
      if (currentValue > 0) return { sentiment: 'bullish', message: `Retail sales growing (${currentValue}% MoM).` };
      if (currentValue < -0.5) return { sentiment: 'bearish', strength: 'strong', message: `Significant decline in retail sales (${currentValue}% MoM).` };
      if (currentValue < 0) return { sentiment: 'bearish', message: `Retail sales declining (${currentValue}% MoM).` };
      return { sentiment: 'neutral', message: `Retail sales are flat.` };
    case 'CCI': // Consumer Confidence Index (Conference Board)
    case 'UMCSENT': // Consumer Sentiment (UMich)
      if (currentValue > 100 && changeDirection === 'increase') return { sentiment: 'bullish', strength: 'strong', message: `${indicatorName} high and rising, indicating strong consumer optimism.` };
      if (changeDirection === 'increase') return { sentiment: 'bullish', message: `${indicatorName} increasing, consumers more optimistic.` };
      if (currentValue < 80 && changeDirection === 'decrease') return { sentiment: 'bearish', strength: 'strong', message: `${indicatorName} low and falling, indicating strong consumer pessimism.` };
      if (changeDirection === 'decrease') return { sentiment: 'bearish', message: `${indicatorName} decreasing, consumers less optimistic.` };
      return { sentiment: 'neutral', message: `${indicatorName} is relatively stable.` };

    // --- Category V: Business Activity & Investment ---
    case 'INDPRO': // Industrial Production Level
    case 'CAPUTIL': // Capacity Utilization Level
      if (changeDirection === 'increase') return { sentiment: 'bullish', message: `${indicatorName} increasing, suggesting strengthening business activity.` };
      if (changeDirection === 'decrease') return { sentiment: 'bearish', message: `${indicatorName} decreasing, suggesting weakening business activity.` };
      return { sentiment: 'neutral', message: `${indicatorName} stable.` };
    // PMI and PMI_SERVICES already covered

    // --- Category VI: Housing Market ---
    case 'HOUSING_STARTS':
    case 'BUILDING_PERMITS':
      if (changeDirection === 'increase') return { sentiment: 'bullish', message: `${indicatorName} increasing, positive for housing sector.` };
      if (changeDirection === 'decrease') return { sentiment: 'bearish', message: `${indicatorName} decreasing, potential slowdown in housing.` };
      return { sentiment: 'neutral', message: `${indicatorName} stable.` };
    case 'MORTGAGE_RATE':
      // Perspective: Lower rates bullish for housing, higher rates bearish
      if (changeDirection === 'decrease') return { sentiment: 'bullish', message: `Mortgage rates falling to ${currentValue}%, improving housing affordability.` };
      if (changeDirection === 'increase') return { sentiment: 'bearish', message: `Mortgage rates rising to ${currentValue}%, reducing housing affordability.` };
      return { sentiment: 'neutral', message: `Mortgage rates stable at ${currentValue}%.` };
    case 'CASE_SHILLER_YOY_PCT': // Home Price Index YoY %
      if (currentValue > 10) return { sentiment: 'mixed', strength: 'strong', message: `Rapid home price appreciation (${currentValue}% YoY), potential affordability issues.` };
      if (currentValue > 3) return { sentiment: 'bullish', message: `Healthy home price growth (${currentValue}% YoY).` };
      if (currentValue < 0) return { sentiment: 'bearish', message: `Home prices declining (${currentValue}% YoY).` };
      return { sentiment: 'neutral', message: `Home price growth is moderate (${currentValue}% YoY).` };

    // --- Category VIII: Financial Conditions & Markets ---
    case 'SP500':
        if (changeDirection === 'increase') return { sentiment: 'bullish', message: 'S&P 500 trending up, positive market sentiment.'};
        if (changeDirection === 'decrease') return { sentiment: 'bearish', message: 'S&P 500 trending down, negative market sentiment.'};
        return { sentiment: 'neutral', message: 'S&P 500 is stable.' };
    case 'FEDFUNDS':
        if (prevValue && currentValue > prevValue) return { sentiment: 'bearish', message: `Fed Funds Rate increased to ${currentValue}%, signaling tighter monetary policy.`};
        if (prevValue && currentValue < prevValue) return { sentiment: 'bullish', message: `Fed Funds Rate decreased to ${currentValue}%, signaling looser monetary policy.`};
        return { sentiment: 'neutral', message: `Fed Funds Rate stable at ${currentValue}%.` };
    case 'US10Y':
        if (prevValue && currentValue > prevValue + 0.15) return { sentiment: 'bearish', strength: 'moderate', message: `10Y Treasury yield rising sharply to ${currentValue}%, may pressure equities.`};
        if (prevValue && currentValue < prevValue - 0.15) return { sentiment: 'bullish', strength: 'moderate', message: `10Y Treasury yield falling sharply to ${currentValue}%, could indicate easing or flight to safety.`};
        if (changeDirection === 'increase') return { sentiment: 'mixed', message: `10Y Treasury yield increasing to ${currentValue}%.`};
        if (changeDirection === 'decrease') return { sentiment: 'mixed', message: `10Y Treasury yield decreasing to ${currentValue}%.`};
        return { sentiment: 'neutral', message: `10Y Treasury yield stable at ${currentValue}%.` };
    case 'VIX':
        if (currentValue > 25) return { sentiment: 'bearish', strength: 'strong', message: `VIX high (${currentValue.toFixed(1)}), indicating significant market fear.` };
        if (currentValue > 18) return { sentiment: 'bearish', message: `VIX elevated (${currentValue.toFixed(1)}), increased market uncertainty.` };
        if (currentValue < 12) return { sentiment: 'bullish', message: `VIX low (${currentValue.toFixed(1)}), indicating market calm/complacency.` };
        return { sentiment: 'neutral', message: `VIX moderate (${currentValue.toFixed(1)}).` };
    case 'CRYPTO_FEAR_GREED':
        if (currentValue > 75) return { sentiment: 'bearish', strength: 'strong', message: `Extreme Greed (${currentValue}) in crypto, potential for correction.` };
        if (currentValue > 55) return { sentiment: 'bullish', message: `Greed (${currentValue}) in crypto market.` };
        if (currentValue < 25) return { sentiment: 'bullish', strength: 'strong', message: `Extreme Fear (${currentValue}) in crypto, potential buying opportunity.` };
        if (currentValue < 45) return { sentiment: 'bearish', message: `Fear (${currentValue}) in crypto market.` };
        return { sentiment: 'neutral', message: `Crypto Fear & Greed Index is neutral (${currentValue}).` };


    default:
      // Generic trend-based signal for calculated % change series
      if (indicator.calculation && indicator.calculation !== 'NONE' && indicator.unit.includes('%')) {
        if (currentValue > 0.1) return { sentiment: 'bullish', message: `${indicatorName} shows positive change (${currentValue.toFixed(2)}%).` };
        if (currentValue < -0.1) return { sentiment: 'bearish', message: `${indicatorName} shows negative change (${currentValue.toFixed(2)}%).` };
        return { sentiment: 'neutral', message: `${indicatorName} shows minimal change (${currentValue.toFixed(2)}%).` };
      }
      // Generic for levels
      if (changeDirection === 'increase') return { sentiment: 'bullish', message: `${indicatorName} is increasing.` };
      if (changeDirection === 'decrease') return { sentiment: 'bearish', message: `${indicatorName} is decreasing.` };
      return { sentiment: 'neutral', message: `${indicatorName} shows no significant change.` };
  }
}