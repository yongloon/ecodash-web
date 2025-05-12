// src/lib/recessionData.ts
export interface RecessionPeriod {
  id: string;
  name: string;
  countryCode: 'US' | 'GLOBAL' | string; // To potentially support other countries
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
}

// Source: NBER for US recessions https://www.nber.org/research/data/us-business-cycle-expansions-and-contractions
export const usRecessionPeriods: RecessionPeriod[] = [
  { id: 'early_90s', name: 'Early 1990s Recession', countryCode: 'US', startDate: '1990-07-01', endDate: '1991-03-01' },
  { id: 'dotcom', name: 'Dot-com Bust Recession', countryCode: 'US', startDate: '2001-03-01', endDate: '2001-11-01' },
  { id: 'gfc', name: 'Great Financial Crisis', countryCode: 'US', startDate: '2007-12-01', endDate: '2009-06-01' },
  { id: 'covid19', name: 'COVID-19 Recession', countryCode: 'US', startDate: '2020-02-01', endDate: '2020-04-01' },
  // Add more historical recessions as needed
  // Example:
  // { id: 'early_80s_double_dip1', name: 'Early 1980s Recession (Part 1)', countryCode: 'US', startDate: '1980-01-01', endDate: '1980-07-01' },
  // { id: 'early_80s_double_dip2', name: 'Early 1980s Recession (Part 2)', countryCode: 'US', startDate: '1981-07-01', endDate: '1982-11-01' },
];

// You could add data for other countries or global recessions here too
// export const globalRecessionPeriods: RecessionPeriod[] = [ ... ];