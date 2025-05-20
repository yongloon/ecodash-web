// src/lib/indicators.ts
import { IconType } from 'react-icons';
import {
  FaChartLine, FaUsers, FaDollarSign, FaHome, FaIndustry, FaPlaneDeparture, FaCar, FaLandmark
} from 'react-icons/fa';
import { BsBank2 } from "react-icons/bs";

export const indicatorCategories = {
  'i': { name: 'Economic Output & Growth', slug: 'economic-output', icon: FaChartLine },
  'ii': { name: 'Labor Market', slug: 'labor-market', icon: FaUsers },
  'iii': { name: 'Inflation & Prices', slug: 'inflation-prices', icon: FaDollarSign },
  'iv': { name: 'Consumer Activity', slug: 'consumer-activity', icon: FaCar },
  'v': { name: 'Business Activity & Investment', slug: 'business-activity', icon: FaIndustry },
  'vi': { name: 'Housing Market', slug: 'housing-market', icon: FaHome },
  'vii': { name: 'International Trade', slug: 'international-trade', icon: FaPlaneDeparture },
  'viii': { name: 'Financial Conditions & Markets', slug: 'financial-conditions', icon: BsBank2 },
} as const;

export type IndicatorCategoryKey = keyof typeof indicatorCategories;

export interface TimeSeriesDataPoint {
  date: string;
  value: number | null;
}

export type CalculationType = 'NONE' | 'YOY_PERCENT' | 'MOM_PERCENT' | 'QOQ_PERCENT' | 'MOM_CHANGE' | 'QOQ_CHANGE';

export interface IndicatorMetadata {
  id: string;
  name: string;
  categoryKey: IndicatorCategoryKey;
  description: string;
  unit: string;
  frequency?: string;
  sourceName: string;
  sourceLink?: string;
  apiSource: 'FRED' | 'AlphaVantage' | 'DBNOMICS' | 'FinnhubQuote' | 'Mock' | 'Other' | 'BLS' | 'BEA' | 'Census' | 'NAR' | 'FRB' | 'Treasury' | 'DOL' | 'ISM' | 'UMich' | 'ConfBoard' | 'CBOE' | 'S&P' | 'FreddieMac' | 'CoinGeckoAPI' | 'AlternativeMeAPI' | 'PolygonIO' | 'ApiNinjas' | 'ApiNinjasHistorical' | 'Tiingo'; // Added Tiingo
  apiIdentifier?: string;
  chartType?: 'line' | 'bar' | 'area';
  calculation?: CalculationType;
  notes?: string;
}

export interface FredObservation { date: string; value: string; }
export interface FredResponse { observations: FredObservation[]; }


export const indicators: IndicatorMetadata[] = [
  // == Category I: Economic Output & Growth ==
  { id: 'GDP_REAL', name: 'Real Gross Domestic Product', categoryKey: 'i', description: 'Value of final goods/services, inflation-adjusted.', unit: 'Billions of Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'GDPC1', chartType: 'line', calculation: 'NONE' },
  { id: 'GDP_GROWTH', name: 'Real GDP Growth Rate', categoryKey: 'i', description: '% change in real GDP, annualized.', unit: '% Change (Annualized)', frequency: 'Quarterly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'A191RL1Q225SBEA', chartType: 'bar', calculation: 'NONE' },
  {
    id: 'GDP_NOMINAL',
    name: 'Nominal Gross Domestic Product',
    categoryKey: 'i',
    description: 'Market value of all final goods and services produced within a country, not adjusted for inflation.',
    unit: 'Billions of Dollars',
    frequency: 'Quarterly',
    sourceName: 'BEA via FRED',
    apiSource: 'FRED',
    apiIdentifier: 'GDP',
    chartType: 'line',
    calculation: 'NONE'
  },
  { id: 'GNP', name: 'Gross National Product', categoryKey: 'i', description: 'Total income earned by a nation\'s people and businesses.', unit: 'Billions of Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'GNP', chartType: 'line', calculation: 'NONE' },
  { id: 'GDP_PER_CAPITA', name: 'Real GDP per Capita', categoryKey: 'i', description: 'Average economic output per person, inflation-adjusted.', unit: 'Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA/Census via FRED', apiSource: 'FRED', apiIdentifier: 'A939RX0Q048SBEA', chartType: 'line', calculation: 'NONE' },
  {
    id: 'GDP_NOMINAL_PER_CAPITA',
    name: 'Nominal GDP per Capita',
    categoryKey: 'i',
    description: 'Average economic output per person, not adjusted for inflation.',
    unit: 'Dollars',
    frequency: 'Quarterly',
    sourceName: 'BEA/Census via FRED (Calculated)',
    apiSource: 'FRED',
    apiIdentifier: 'GDP/POP', 
    chartType: 'line',
    calculation: 'NONE',
    notes: 'Calculated as Nominal GDP divided by Total Population. Fetch requires two series.'
  },

  // == Category II: Labor Market ==
  { id: 'UNRATE', name: 'Unemployment Rate', categoryKey: 'ii', description: '% of labor force unemployed but seeking work.', unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'UNRATE', chartType: 'line', calculation: 'NONE' },
  { id: 'PAYEMS_MOM_CHG', name: 'Non-Farm Payrolls (MoM Change)', categoryKey: 'ii', description: 'Monthly change in total paid U.S. non-farm workers.', unit: 'Thousands of Persons', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'PAYEMS', chartType: 'bar', calculation: 'MOM_CHANGE', notes: 'Calculated from PAYEMS series.' },
  { id: 'AVGHRLY_YOY_PCT', name: 'Average Hourly Earnings (YoY %)', categoryKey: 'ii', description: 'YoY % change in avg hourly earnings (private sector).', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'CES0500000003', chartType: 'bar', calculation: 'YOY_PERCENT', notes: 'Calculated from level data.' },
  { id: 'LFPR', name: 'Labor Force Participation Rate', categoryKey: 'ii', description: '% of working-age population in the labor force.', unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'CIVPART', chartType: 'line', calculation: 'NONE' },
  { id: 'JOBLESSCLAIMS', name: 'Initial Jobless Claims', categoryKey: 'ii', description: 'New unemployment insurance filings (SA).', unit: 'Number', frequency: 'Weekly', sourceName: 'DOL via FRED', apiSource: 'FRED', apiIdentifier: 'ICSA', chartType: 'line', calculation: 'NONE' },
  { id: 'JOLTS', name: 'JOLTS - Job Openings', categoryKey: 'ii', description: 'Total job openings on last business day of month (SA).', unit: 'Thousands', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'JTSJOL', chartType: 'line', calculation: 'NONE' },
  { id: 'ECI', name: 'Employment Cost Index (ECI)', categoryKey: 'ii', description: 'YoY % change in labor costs (wages & benefits) for civilian workers.', unit: '% Change YoY', frequency: 'Quarterly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'ECIALLCIV', chartType: 'bar', calculation: 'YOY_PERCENT', notes: 'Calculated from index level.' },
  { id: 'U6RATE', name: 'Underemployment Rate (U-6)', categoryKey: 'ii', description: 'Broader measure of labor underutilization.', unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'U6RATE', chartType: 'line', calculation: 'NONE' },
  { id: 'QUITRATE', name: 'Quit Rate (JOLTS)', categoryKey: 'ii', description: 'Quits as a % of total employment.', unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'JTSQUR', chartType: 'line', calculation: 'NONE' },
  { id: 'HIRERATE', name: 'Hire Rate (JOLTS)', categoryKey: 'ii', description: 'Hires as a % of total employment.', unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'JTSHIR', chartType: 'line', calculation: 'NONE' },
  { id: 'PRODUCTIVITY', name: 'Productivity (Output Per Hour)', categoryKey: 'ii', description: 'Output per hour in the nonfarm business sector.', unit: 'Index 2012=100', frequency: 'Quarterly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'OPHNFB', chartType: 'line', calculation: 'NONE' },

  // == Category III: Inflation & Prices ==
  { id: 'CPI_YOY_PCT', name: 'Consumer Price Index (CPI-U, YoY %)', categoryKey: 'iii', description: 'YoY % change in consumer prices (urban).', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'CPIAUCSL', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'CORE_CPI_YOY_PCT', name: 'Core CPI (YoY %)', categoryKey: 'iii', description: 'YoY % change in CPI excluding food & energy.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'CPILFESL', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'PPI_YOY_PCT', name: 'Producer Price Index (Final Demand, YoY %)', categoryKey: 'iii', description: 'YoY % change in prices received by domestic producers.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'PPIACO', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'PCE_YOY_PCT', name: 'PCE Price Index (YoY %)', categoryKey: 'iii', description: 'YoY % change in Personal Consumption Expenditures Price Index.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'PCEPI', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'CORE_PCE_YOY_PCT', name: 'Core PCE Price Index (YoY %)', categoryKey: 'iii', description: 'YoY % change in Core PCE Price Index (ex. food & energy).', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'PCEPILFE', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'GDPDEF_YOY_PCT', name: 'GDP Deflator (YoY %)', categoryKey: 'iii', description: 'YoY % change in the price level of all new, domestically produced final goods/services.', unit: '% Change YoY', frequency: 'Quarterly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'GDPDEF', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'IMPORT_PRICES_YOY_PCT', name: 'Import Price Index (YoY %)', categoryKey: 'iii', description: 'YoY % change in prices of imported goods.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'IR', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'EXPORT_PRICES_YOY_PCT', name: 'Export Price Index (YoY %)', categoryKey: 'iii', description: 'YoY % change in prices of exported goods.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED', apiSource: 'FRED', apiIdentifier: 'IQ', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'OIL_WTI', name: 'Crude Oil Price (WTI)', categoryKey: 'iii', description: 'West Texas Intermediate crude oil spot price.', unit: 'USD per Barrel', frequency: 'Daily', sourceName: 'EIA via FRED', apiSource: 'FRED', apiIdentifier: 'WTISPLC', chartType: 'line', calculation: 'NONE' },
  { id: 'INFL_EXPECT_UMICH', name: 'Inflation Expectations (UMich 1-Year)', categoryKey: 'iii', description: 'Median expected price change (next 12 months) from UMich Survey.', unit: '%', frequency: 'Monthly', sourceName: 'UMich via FRED', apiSource: 'FRED', apiIdentifier: 'MICH', chartType: 'line', calculation: 'NONE' },
  { id: 'TIPS_BREAKEVEN_5Y', name: 'TIPS Breakeven Inflation Rate (5-Year)', categoryKey: 'iii', description: 'Difference between nominal Treasury yield and TIPS yield of same maturity.', unit: '%', frequency: 'Daily', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'T5YIE', chartType: 'line', calculation: 'NONE' },
  {
    id: 'GOLD_PRICE', // This will now be Tiingo Spot Gold
    name: 'Spot Gold Price',
    categoryKey: 'iii',
    description: 'Spot price of gold in U.S. Dollars per troy ounce.',
    unit: 'USD per Ounce', // Or just USD if Tiingo provides it as XAU/USD
    frequency: 'Daily',
    sourceName: 'Tiingo',           // CHANGED
    apiSource: 'Tiingo',            // CHANGED
    apiIdentifier: 'XAUUSD',        // ASSUMPTION - VERIFY THIS TICKER ON TIINGO
    chartType: 'line',
    calculation: 'NONE',
    notes: 'Data sourced from Tiingo. Represents daily closing/spot price.'
  },
  {
    id: 'SILVER_PRICE', // NEW - Tiingo Spot Silver
    name: 'Spot Silver Price',
    categoryKey: 'iii',
    description: 'Spot price of silver in U.S. Dollars per troy ounce.',
    unit: 'USD per Ounce', // Or just USD
    frequency: 'Daily',
    sourceName: 'Tiingo',
    apiSource: 'Tiingo',
    apiIdentifier: 'XAGUSD',        // ASSUMPTION - VERIFY THIS TICKER ON TIINGO
    chartType: 'line',
    calculation: 'NONE',
    notes: 'Data sourced from Tiingo. Represents daily closing/spot price.'
  },
 

  // == Category IV: Consumer Activity ==
  { id: 'RETAIL_SALES_MOM_PCT', name: 'Retail Sales (Advance, MoM %)', categoryKey: 'iv', description: 'MoM % change in retail/food services sales.', unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'RSAFS', chartType: 'bar', calculation: 'MOM_PERCENT' },
  { id: 'PERS_INC_MOM_PCT', name: 'Personal Income (MoM %)', categoryKey: 'iv', description: 'MoM % change in income received by individuals.', unit: '% Change MoM', frequency: 'Monthly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'PI', chartType: 'bar', calculation: 'MOM_PERCENT' },
  { id: 'PERS_OUTLAYS_MOM_PCT', name: 'Personal Outlays (PCE, MoM %)', categoryKey: 'iv', description: 'MoM % change in personal consumption expenditures, interest, and transfers.', unit: '% Change MoM', frequency: 'Monthly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'PCE', chartType: 'bar', calculation: 'MOM_PERCENT' },
  { id: 'CONSUMER_CREDIT_YOY_PCT', name: 'Consumer Credit Outstanding (YoY %)', categoryKey: 'iv', description: 'YoY % change in total outstanding consumer debt.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'TOTALSL', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'UMCSENT', name: 'Consumer Sentiment Index (UMich)', categoryKey: 'iv', description: 'University of Michigan\'s index measuring consumer sentiment.', unit: 'Index Q1 1966=100', frequency: 'Monthly', sourceName: 'UMich via FRED', apiSource: 'FRED', apiIdentifier: 'UMCSENT', chartType: 'line', calculation: 'NONE' },
  { id: 'VEHICLE_SALES', name: 'Light Weight Vehicle Sales', categoryKey: 'iv', description: 'Total sales of new lightweight vehicles (SAAR).', unit: 'Millions of Units (SAAR)', frequency: 'Monthly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'ALTSALES', chartType: 'line', calculation: 'NONE' },
  { id: 'SAVINGS_RATE', name: 'Personal Savings Rate', categoryKey: 'iv', description: 'Personal saving as a % of disposable personal income.', unit: '%', frequency: 'Monthly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'PSAVERT', chartType: 'line', calculation: 'NONE' },
  { id: 'CC_DELINQUENCY', name: 'Credit Card Delinquency Rate', categoryKey: 'iv', description: 'Delinquency rate on credit card loans (all commercial banks).', unit: '% (SA)', frequency: 'Quarterly', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'DRCCLACBS', chartType: 'line', calculation: 'NONE' },

  // == Category V: Business Activity & Investment ==
  { id: 'INDPRO', name: 'Industrial Production Index', categoryKey: 'v', description: 'Real output of manufacturing, mining, and utilities.', unit: 'Index 2017=100', frequency: 'Monthly', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'INDPRO', chartType: 'area', calculation: 'NONE' },
  { id: 'CAPUTIL', name: 'Capacity Utilization', categoryKey: 'v', description: '% of industrial capacity currently in use.', unit: '% of Capacity', frequency: 'Monthly', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'TCU', chartType: 'line', calculation: 'NONE' },
  {
  id: 'PMI', name: 'Manufacturing PMI (ISM)', categoryKey: 'v',
  description: 'Purchasing Managers Index for the manufacturing sector by the Institute for Supply Management. >50 indicates expansion.',
  unit: 'Index', frequency: 'Monthly',
  sourceName: 'ISM via DB.nomics', 
  apiSource: 'DBNOMICS',            
  apiIdentifier: 'ISM/pmi/pm',     // <<< CORRECTED IDENTIFIER
  chartType: 'line', calculation: 'NONE',
  notes: 'A reading above 50 percent indicates that the manufacturing economy is generally expanding; below 50 percent indicates that it is generally contracting.'
},
  { id: 'DUR_GOODS_MOM_PCT', name: 'Durable Goods Orders (New Orders, MoM %)', categoryKey: 'v', description: 'MoM % change in new orders for durable goods.', unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'DGORDER', chartType: 'bar', calculation: 'MOM_PERCENT', notes: 'Includes transportation.' },
  { id: 'FACTORY_ORDERS_MOM_PCT', name: 'Factory Orders (MoM %)', categoryKey: 'v', description: 'MoM % change in new orders for manufactured goods.', unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'AMTMNO', chartType: 'bar', calculation: 'MOM_PERCENT' },
  { id: 'BUS_INVENTORIES_MOM_PCT', name: 'Business Inventories (MoM %)', categoryKey: 'v', description: 'MoM % change in total value of business inventories.', unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'BUSINV', chartType: 'bar', calculation: 'MOM_PERCENT' },
  { id: 'CORP_PROFITS_QOQ_PCT', name: 'Corporate Profits After Tax (QoQ %)', categoryKey: 'v', description: 'QoQ % change in net corporate profits after tax.', unit: '% Change QoQ', frequency: 'Quarterly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'CP', chartType: 'bar', calculation: 'QOQ_PERCENT' },
  { id: 'NONRES_INVESTMENT', name: 'Nonresidential Fixed Investment', categoryKey: 'v', description: 'Business spending on structures, equipment, and IP.', unit: 'Billions of Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'PNFI', chartType: 'line', calculation: 'NONE' },

  // == Category VI: Housing Market ==
  { id: 'CASE_SHILLER_YOY_PCT', name: 'S&P Case-Shiller Home Price Index (YoY %)', categoryKey: 'vi', description: 'YoY % change in S&P Case-Shiller National Home Price Index.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'S&P via FRED', apiSource: 'FRED', apiIdentifier: 'CSUSHPINSA', chartType: 'bar', calculation: 'YOY_PERCENT' },
  { id: 'HOUSING_STARTS', name: 'Housing Starts', categoryKey: 'vi', description: 'New residential construction projects started (SAAR).', unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'HOUST', chartType: 'area', calculation: 'NONE' },
  { id: 'BUILDING_PERMITS', name: 'Building Permits', categoryKey: 'vi', description: 'Permits authorized for new private housing units (SAAR).', unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'PERMIT', chartType: 'line', calculation: 'NONE' },
  { id: 'EXISTING_HOME_SALES', name: 'Existing Home Sales', categoryKey: 'vi', description: 'Closed sales of previously owned homes (SAAR).', unit: 'Millions of Units (SAAR)', frequency: 'Monthly', sourceName: 'NAR via FRED', apiSource: 'FRED', apiIdentifier: 'EXHOSLUSM495S', chartType: 'line', calculation: 'NONE' },
  { id: 'NEW_HOME_SALES', name: 'New Home Sales', categoryKey: 'vi', description: 'Newly constructed single-family homes sold (SAAR).', unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'HSN1F', chartType: 'line', calculation: 'NONE' },
  { id: 'HOUSING_AFFORD', name: 'Housing Affordability Index', categoryKey: 'vi', description: 'Measures if a typical family can qualify for a mortgage on a typical home.', unit: 'Index', frequency: 'Monthly', sourceName: 'NAR via FRED', apiSource: 'FRED', apiIdentifier: 'FIXHAI', chartType: 'line', calculation: 'NONE' },
  { id: 'MORTGAGE_DELINQUENCY', name: 'Mortgage Delinquency Rate', categoryKey: 'vi', description: 'Delinquency rate on single-family residential mortgages.', unit: '% (SA)', frequency: 'Quarterly', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'DRSFRMACBS', chartType: 'line', calculation: 'NONE' },
  { id: 'RENTAL_VACANCY', name: 'Rental Vacancy Rate', categoryKey: 'vi', description: '% of rental housing units vacant and available.', unit: '%', frequency: 'Quarterly', sourceName: 'Census via FRED', apiSource: 'FRED', apiIdentifier: 'RRVRUSQ156N', chartType: 'line', calculation: 'NONE' },
  { id: 'MORTGAGE_RATE', name: '30-Year Fixed Mortgage Rate', categoryKey: 'vi', description: 'Average 30-year fixed mortgage rate in the U.S.', unit: '%', frequency: 'Weekly', sourceName: 'Freddie Mac via FRED', apiSource: 'FRED', apiIdentifier: 'MORTGAGE30US', chartType: 'line', calculation: 'NONE' },

  // == Category VII: International Trade ==
  { id: 'TRADE_BALANCE', name: 'Balance of Trade (Goods & Services)', categoryKey: 'vii', description: 'Difference between a country\'s exports and imports.', unit: 'Billions of Dollars', frequency: 'Monthly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'BOPGSTB', chartType: 'bar', calculation: 'NONE' },
  { id: 'CURRENT_ACCOUNT', name: 'Current Account Balance', categoryKey: 'vii', description: 'Broad measure of trade including goods, services, income, and transfers.', unit: 'Billions of Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED', apiSource: 'FRED', apiIdentifier: 'BOPBCA', chartType: 'bar', calculation: 'NONE' },

  // == Category VIII: Financial Conditions & Markets ==
  {
    id: 'FEDFUNDS', name: 'Federal Funds Effective Rate', categoryKey: 'viii',
    description: 'The interest rate at which commercial banks lend reserves to each other overnight, a key monetary policy tool.',
    unit: '%', frequency: 'Monthly',
    sourceName: 'Board of Governors of the Federal Reserve System (US) via FRED',
    apiSource: 'FRED', apiIdentifier: 'FEDFUNDS',
    chartType: 'line', calculation: 'NONE',
    notes: 'Monthly average of daily effective federal funds rate.'
  },
  { id: 'SP500', name: 'S&P 500 Index', categoryKey: 'viii', description: 'Tracks stock performance of 500 large U.S. companies.', unit: 'Index Value', frequency: 'Daily', sourceName: 'S&P Dow Jones Indices via FRED', apiSource: 'FRED', apiIdentifier: 'SP500', chartType: 'line', calculation: 'NONE' },
  { id: 'M2_YOY_PCT', name: 'M2 Money Stock (YoY %)', categoryKey: 'viii', description: 'YoY % change in M2 money stock.', unit: '% Change YoY', frequency: 'Monthly', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'M2SL', chartType: 'bar', calculation: 'YOY_PERCENT', notes: 'Calculated from M2SL level data.' },
  { id: 'M2SL', name: 'M2 Money Stock (Level)', categoryKey: 'viii', description: 'Total M2 money supply (SA).', unit: 'Billions of Dollars (SA)', frequency: 'Monthly', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'M2SL', chartType: 'area', calculation: 'NONE' },
  { id: 'US10Y', name: 'US 10-Year Treasury Yield', categoryKey: 'viii', description: 'Yield on U.S. 10-year government debt.', unit: '%', frequency: 'Daily', sourceName: 'U.S. Treasury via FRED', apiSource: 'FRED', apiIdentifier: 'DGS10', chartType: 'line', calculation: 'NONE' },
  { id: 'USD_EUR', name: 'USD/EUR Exchange Rate', categoryKey: 'viii', description: 'Value of 1 U.S. Dollar in Euros.', unit: 'EUR per USD', frequency: 'Daily', sourceName: 'FRB via FRED', apiSource: 'FRED', apiIdentifier: 'DEXUSEU', chartType: 'line', calculation: 'NONE' },
  { id: 'VIX', name: 'Volatility Index (VIX)', categoryKey: 'viii', description: 'Market expectation of near-term S&P 500 volatility.', unit: 'Index', frequency: 'Daily', sourceName: 'CBOE via FRED', apiSource: 'FRED', apiIdentifier: 'VIXCLS', chartType: 'line', calculation: 'NONE' },
  { id: 'CORP_BOND_SPREAD_BAA', name: 'Corporate Bond Spread (Baa)', categoryKey: 'viii', description: 'Difference between Moody\'s Baa Corp Bond Yield and 10-Yr Treasury.', unit: '%', frequency: 'Daily', sourceName: 'Moody\'s/Treasury via FRED', apiSource: 'FRED', apiIdentifier: 'BAA10Y', chartType: 'line', calculation: 'NONE' },
  {
    id: 'BTC_PRICE_USD', name: 'Bitcoin Price (USD)', categoryKey: 'viii',
    description: 'Daily closing price of Bitcoin in US Dollars from Coinbase.',
    unit: 'USD', frequency: 'Daily',
    sourceName: 'Coinbase via FRED',
    apiSource: 'FRED', apiIdentifier: 'CBBTCUSD',
    chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'ETH_PRICE_USD', name: 'Ethereum Price (USD)', categoryKey: 'viii',
    description: 'Daily closing price of Ethereum in US Dollars from Coinbase.',
    unit: 'USD', frequency: 'Daily',
    sourceName: 'Coinbase via FRED',
    apiSource: 'FRED', apiIdentifier: 'CBETHUSD',
    chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'CRYPTO_FEAR_GREED', name: 'Crypto Fear & Greed Index', categoryKey: 'viii',
    description: 'Measures current sentiment in the Bitcoin and broader cryptocurrency market.',
    unit: 'Index (0-100)', frequency: 'Daily',
    sourceName: 'Alternative.me',
    apiSource: 'AlternativeMeAPI', apiIdentifier: 'fear-and-greed',
    chartType: 'line', calculation: 'NONE',
  },
  // ETFs now using Tiingo
  {
    id: 'TLT_ETF', name: 'iShares 20+ Year Treasury Bond ETF (TLT)', categoryKey: 'viii',
    description: 'Tracks the performance of U.S. Treasury bonds with remaining maturities greater than twenty years.',
    unit: 'USD', frequency: 'Daily',
    sourceName: 'Tiingo',
    apiSource: 'Tiingo',
    apiIdentifier: 'TLT',
    chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'LQD_ETF', name: 'Inv. Grade Corp Bond ETF (LQD)', categoryKey: 'viii',
    description: 'iShares iBoxx $ Investment Grade Corporate Bond ETF.',
    unit: 'USD', frequency: 'Daily',
    sourceName: 'Tiingo',
    apiSource: 'Tiingo',
    apiIdentifier: 'LQD',
    chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'VNQ_ETF', name: 'Real Estate ETF (VNQ)', categoryKey: 'viii',
    description: 'Vanguard Real Estate ETF, tracks a broad U.S. REIT index.',
    unit: 'USD', frequency: 'Daily',
    sourceName: 'Tiingo',
    apiSource: 'Tiingo',
    apiIdentifier: 'VNQ',
    chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'ARKK_ETF', name: 'ARK Innovation ETF (ARKK)', categoryKey: 'viii',
    description: 'Invests in disruptive innovation companies; speculative growth.',
    unit: 'USD', frequency: 'Daily',
    sourceName: 'Tiingo',
    apiSource: 'Tiingo',
    apiIdentifier: 'ARKK',
    chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'TQQQ_ETF', name: 'ProShares UltraPro QQQ (TQQQ)', categoryKey: 'viii',
    description: 'Seeks daily investment results that correspond to three times (3x) the daily performance of the Nasdaq-100 Index.',
    unit: 'USD', frequency: 'Daily',
    sourceName: 'Tiingo',
    apiSource: 'Tiingo',
    apiIdentifier: 'TQQQ',
    chartType: 'line', calculation: 'NONE',
    notes: 'Highly volatile leveraged ETF, intended for short-term tactical use.'
  },
];

// Helper functions
export function getIndicatorById(id: string): IndicatorMetadata | undefined {
  return indicators.find(ind => ind.id === id);
}
export function getIndicatorsByCategorySlug(slug: string): IndicatorMetadata[] {
   const categoryKey = Object.keys(indicatorCategories).find(key => indicatorCategories[key as IndicatorCategoryKey].slug === slug) as IndicatorCategoryKey | undefined;
   if (!categoryKey) return [];
   return indicators.filter(ind => ind.categoryKey === categoryKey);
}
export function getCategoryBySlug(slug: string): typeof indicatorCategories[IndicatorCategoryKey] | undefined {
    const categoryKey = Object.keys(indicatorCategories).find(key => indicatorCategories[key as IndicatorCategoryKey].slug === slug) as IndicatorCategoryKey | undefined;
    return categoryKey ? indicatorCategories[categoryKey] : undefined;
}