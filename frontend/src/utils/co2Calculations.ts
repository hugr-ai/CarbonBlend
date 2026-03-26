import { scaleLinear } from 'd3-scale';
import { rgb } from 'd3-color';

export interface BlendStream {
  name: string;
  flow_rate: number;
  co2_mol_pct: number;
}

/**
 * Client-side blending calculation for instant preview.
 * Weighted average of CO2 mol% by flow rate.
 */
export function calculateBlend(streams: BlendStream[]): number {
  const totalFlow = streams.reduce((sum, s) => sum + s.flow_rate, 0);
  if (totalFlow === 0) return 0;

  const weightedCO2 = streams.reduce(
    (sum, s) => sum + s.co2_mol_pct * s.flow_rate,
    0
  );
  return weightedCO2 / totalFlow;
}

/**
 * Maps CO2 percentage to a hex color.
 * 0% -> green (#51cf66)
 * 2.5% -> yellow (#fcc419)
 * 5%+ -> red (#ff6b6b)
 */
const co2ColorScale = scaleLinear<string>()
  .domain([0, 2.5, 5])
  .range(['#51cf66', '#fcc419', '#ff6b6b'])
  .clamp(true);

export function getCO2Color(co2Pct: number): string {
  const color = co2ColorScale(co2Pct);
  const parsed = rgb(color);
  return parsed.formatHex();
}

/**
 * Format CO2 value for display.
 */
export function formatCO2(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${value.toFixed(1)} mol%`;
}

/**
 * Check if CO2 level is within the standard 2.5 mol% limit.
 */
export function isWithinCO2Limit(co2Pct: number, limit = 2.5): boolean {
  return co2Pct <= limit;
}

/**
 * Calculate how much CO2 needs to be removed to meet the limit.
 */
export function co2RemovalNeeded(
  co2Pct: number,
  flowRate: number,
  limit = 2.5
): number {
  if (co2Pct <= limit) return 0;
  return ((co2Pct - limit) / 100) * flowRate;
}
