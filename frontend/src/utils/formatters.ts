/**
 * Format cost in millions USD.
 */
export function formatCost(musd: number | null | undefined): string {
  if (musd == null) return 'N/A';
  if (Math.abs(musd) >= 1000) {
    return `${(musd / 1000).toFixed(1)} BUSD`;
  }
  return `${musd.toFixed(1)} MUSD`;
}

/**
 * Format gas flow rate.
 */
export function formatFlow(mscm_d: number | null | undefined): string {
  if (mscm_d == null) return 'N/A';
  return `${mscm_d.toFixed(1)} MSm\u00B3/d`;
}

/**
 * Format percentage.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

/**
 * Format large numbers with K/M/B suffixes.
 */
export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Format date string.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Country flag emoji from ISO code.
 */
export function countryFlag(countryCode: string): string {
  const flags: Record<string, string> = {
    UK: '\uD83C\uDDEC\uD83C\uDDE7',
    GB: '\uD83C\uDDEC\uD83C\uDDE7',
    DE: '\uD83C\uDDE9\uD83C\uDDEA',
    BE: '\uD83C\uDDE7\uD83C\uDDEA',
    FR: '\uD83C\uDDEB\uD83C\uDDF7',
    NO: '\uD83C\uDDF3\uD83C\uDDF4',
    NL: '\uD83C\uDDF3\uD83C\uDDF1',
    Germany: '\uD83C\uDDE9\uD83C\uDDEA',
    Belgium: '\uD83C\uDDE7\uD83C\uDDEA',
    France: '\uD83C\uDDEB\uD83C\uDDF7',
    'United Kingdom': '\uD83C\uDDEC\uD83C\uDDE7',
    Norway: '\uD83C\uDDF3\uD83C\uDDF4',
    Netherlands: '\uD83C\uDDF3\uD83C\uDDF1',
  };
  return flags[countryCode] ?? '\uD83C\uDFF3\uFE0F';
}
