// src/lib/indicators.ts
import { IconType } from 'react-icons';
import { FaChartLine, FaUsers, FaDollarSign, FaHome, FaIndustry, FaBalanceScale, FaExchangeAlt, FaBuilding, FaPlaneDeparture, FaSeedling, FaCar } from 'react-icons/fa';
import { IoStatsChart, IoTrendingUp, IoTrendingDown } from "react-icons/io5";
import { BsBank2, BsGraphUpArrow } from "react-icons/bs";

// Define categories with slugs and icons (no changes here)
export const indicatorCategories = {
  'i': { name: 'Overall Economic Output & Growth', slug: 'economic-output', icon: FaChartLine },
  'ii': { name: 'Labor Market', slug: 'labor-market', icon: FaUsers },
  'iii': { name: 'Inflation & Prices', slug: 'inflation-prices', icon: FaDollarSign },
  'iv': { name: 'Consumer Activity', slug: 'consumer-activity', icon: FaCar },
  'v': { name: 'Business Activity & Investment', slug: 'business-activity', icon: FaBuilding },
  'vi': { name: 'Housing Market', slug: 'housing-market', icon: FaHome },
  'vii': { name: 'International Trade', slug: 'international-trade', icon: FaPlaneDeparture },
  'viii': { name: 'Financial Markets', slug: 'financial-markets', icon: BsBank2 },
} as const;

export type IndicatorCategoryKey = keyof typeof indicatorCategories;

export interface TimeSeriesDataPoint {
  date: string;
  value: number | null;
}

// Added CalculationType to explicitly define what kind of calculation is needed
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
  apiSource: 'FRED' | 'AlphaVantage' | 'Mock' | 'Other' | 'BLS' | 'BEA' | 'Census' | 'NAR' | 'FRB' | 'Treasury' | 'DOL' | 'ISM' | 'UMich' | 'ConfBoard' | 'CBOE' | 'S&P' | 'FreddieMac';
  apiIdentifier?: string; // This should be for the BASE series if calculation is needed
  chartType?: 'line' | 'bar' | 'area';
  calculation?: CalculationType; // Explicitly state if a calculation is needed
  notes?: string; // General notes
}

export const indicators: IndicatorMetadata[] = [
  // --- I. Overall Economic Output & Growth ---
  {
    id: 'GDP_REAL', name: 'Real Gross Domestic Product', categoryKey: 'i',
    description: 'Measures the value of final goods and services produced within a country during a specific period, adjusted for inflation.',
    unit: 'Billions of Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'GDPC1', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'GDP_GROWTH', name: 'Real GDP Growth Rate', categoryKey: 'i',
    description: 'The percentage change in real GDP from the preceding period, annualized.',
    unit: '% Change (Annualized)', frequency: 'Quarterly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'A191RL1Q225SBEA', chartType: 'bar', calculation: 'NONE', // This FRED series is already a growth rate
  },
  // ... (other Category I indicators - assuming they are direct values or pre-calculated by FRED)
  {
    id: 'INDPRO', name: 'Industrial Production Index', categoryKey: 'i',
    description: 'Measures the real output of manufacturing, mining, and electric and gas utilities.',
    unit: 'Index 2017=100', frequency: 'Monthly', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'INDPRO', chartType: 'area', calculation: 'NONE',
  },

  // --- II. Labor Market ---
  {
    id: 'UNRATE', name: 'Unemployment Rate', categoryKey: 'ii',
    description: 'The percentage of the total labor force that is unemployed but actively seeking employment.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'UNRATE', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'PAYEMS_MOM_CHG', name: 'Non-Farm Payrolls (Monthly Change)', categoryKey: 'ii',
    description: 'The monthly change in the total number of paid U.S. workers, excluding farm and some government/nonprofit jobs.',
    unit: 'Thousands of Persons', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'PAYEMS', chartType: 'bar', calculation: 'MOM_CHANGE',
    notes: 'Calculated as month-over-month change from PAYEMS series.',
  },
  {
    id: 'AVGHRLY_YOY_PCT', name: 'Average Hourly Earnings (YoY %)', categoryKey: 'ii',
    description: 'Year-over-year percentage change in average hourly earnings of private sector production and nonsupervisory employees.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'CES0500000003', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated as YoY % change from level data.',
  },
  // ... (other Category II indicators)

  // --- III. Inflation & Prices ---
   {
    id: 'CPI_YOY_PCT', name: 'Consumer Price Index (CPI-U, YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the average price level of a basket of consumer goods and services purchased by urban households.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'CPIAUCSL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from CPIAUCSL index.',
  },
   {
    id: 'CORE_CPI_YOY_PCT', name: 'Core CPI (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in CPI excluding volatile food and energy components.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'CPILFESL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from CPILFESL index.',
  },
  {
    id: 'PPI_YOY_PCT', name: 'Producer Price Index (Final Demand, YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the average selling prices received by domestic producers for their output (Final Demand).',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'PPIACO', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from PPIACO index.',
  },
  {
    id: 'PCE_YOY_PCT', name: 'PCE Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the price index for Personal Consumption Expenditures.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'PCEPI', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from PCEPI index.',
  },
   {
    id: 'CORE_PCE_YOY_PCT', name: 'Core PCE Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the PCE Price Index excluding food and energy.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'PCEPILFE', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from PCEPILFE index.',
  },
  {
    id: 'GDPDEF_YOY_PCT', name: 'GDP Deflator (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the measure of the level of prices of all new, domestically produced, final goods and services in an economy.',
    unit: '% Change YoY', frequency: 'Quarterly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'GDPDEF', chartType: 'bar', calculation: 'YOY_PERCENT', // Note: GDPDEF is quarterly, so YoY needs 4 period lookback
    notes: 'Calculated from GDPDEF index.',
  },
  {
    id: 'IMPORT_PRICES_YOY_PCT', name: 'Import Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the prices of goods purchased from abroad by U.S. residents.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'IR', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from Import Price Index (All Commodities).',
  },
  {
    id: 'EXPORT_PRICES_YOY_PCT', name: 'Export Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the prices of goods sold abroad by U.S. residents.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'IQ', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from Export Price Index (All Commodities).',
  },
  // ... (other Category III indicators like OIL_WTI, INFL_EXPECT_UMICH, TIPS_BREAKEVEN_5Y are direct values)

  // --- IV. Consumer Activity ---
  {
    id: 'RETAIL_SALES_MOM_PCT', name: 'Retail Sales (Advance, MoM %)', categoryKey: 'iv',
    description: 'Month-over-month percentage change in estimated sales for retail and food services firms.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'RSAFS', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from RSAFS level data.',
  },
  {
    id: 'PERS_INC_MOM_PCT', name: 'Personal Income (MoM %)', categoryKey: 'iv',
    description: 'Month-over-month percentage change in income received by individuals from all sources.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'PI', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from PI level data.',
  },
  {
    id: 'PERS_OUTLAYS_MOM_PCT', name: 'Personal Outlays (PCE, MoM %)', categoryKey: 'iv',
    description: 'Month-over-month percentage change in personal consumption expenditures (PCE), interest payments, and transfer payments.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'PCE', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from PCE level data.',
  },
  {
    id: 'CONSUMER_CREDIT_YOY_PCT', name: 'Consumer Credit Outstanding (YoY %)', categoryKey: 'iv',
    description: 'Year-over-year percentage change in total outstanding consumer debt (revolving and non-revolving).',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'TOTALSL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from TOTALSL level data.',
  },
  // ... (other Category IV indicators like CCI, UMCSENT, VEHICLE_SALES, SAVINGS_RATE are direct values/indices)

  // --- V. Business Activity & Investment ---
  {
    id: 'DUR_GOODS_MOM_PCT', name: 'Durable Goods Orders (New Orders, MoM %)', categoryKey: 'v',
    description: 'Month-over-month percentage change in new orders received by manufacturers of goods planned to last three years or more.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'DGORDER', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from DGORDER level data.',
  },
  {
    id: 'FACTORY_ORDERS_MOM_PCT', name: 'Factory Orders (MoM %)', categoryKey: 'v',
    description: 'Month-over-month percentage change in new orders for manufactured goods (durable and non-durable).',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'AMTMNO', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from AMTMNO level data.',
  },
  {
    id: 'BUS_INVENTORIES_MOM_PCT', name: 'Business Inventories (MoM %)', categoryKey: 'v',
    description: 'Month-over-month percentage change in the total value of inventories held by manufacturers, wholesalers, and retailers.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'BUSINV', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from BUSINV level data.',
  },
  {
    id: 'CORP_PROFITS_QOQ_PCT', name: 'Corporate Profits After Tax (QoQ %)', categoryKey: 'v',
    description: 'Quarter-over-quarter percentage change in the net profits of corporations after taxes.',
    unit: '% Change QoQ', frequency: 'Quarterly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'CP', chartType: 'bar', calculation: 'QOQ_PERCENT',
    notes: 'Calculated from CP level data.',
  },
  // ... (other Category V indicators like PMI, PMI_SERVICES are direct indices)

  // --- VI. Housing Market ---
  {
    id: 'CASE_SHILLER_YOY_PCT', name: 'S&P Case-Shiller Home Price Index (YoY %)', categoryKey: 'vi',
    description: 'Year-over-year percentage change in a leading measure of U.S. residential real estate prices (National Index).',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'S&P',
    apiSource: 'FRED', apiIdentifier: 'CSUSHPINSA', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from CSUSHPINSA index.',
  },
  // ... (other Category VI indicators are mostly direct values/indices)

  // --- VIII. Financial Markets ---
  {
    id: 'SP500', name: 'S&P 500 Index', categoryKey: 'viii',
    description: 'Stock market index representing the performance of 500 large companies listed on stock exchanges in the United States.',
    unit: 'Index Value', frequency: 'Daily', sourceName: 'S&P',
    apiSource: 'Mock', apiIdentifier: 'SP500', chartType: 'line', calculation: 'NONE',
    notes: 'Requires dedicated financial API for real data. Mock data uses realistic values.',
  },
  {
    id: 'M2_YOY_PCT', name: 'M2 Money Stock (YoY %)', categoryKey: 'viii',
    description: 'Year-over-year percentage change in the M2 money stock.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'M2SL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from M2SL level data.',
  },
  // ... (other Category VIII indicators like FED_FUNDS, US10Y, M2SL are direct values)

  // Ensure all previously defined indicators are here and have `calculation: 'NONE'` if they don't need it.
  // Example:
  {
    id: 'GNP', name: 'Gross National Product', categoryKey: 'i',
    description: 'Measures the total income earned by a nation\'s people and businesses, including investment income earned abroad.',
    unit: 'Billions of Dollars', frequency: 'Quarterly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'GNP', chartType: 'line', calculation: 'NONE',
   },
   {
    id: 'GDP_PER_CAPITA', name: 'Real GDP per Capita', categoryKey: 'i',
    description: 'Real Gross Domestic Product divided by the population; measures average economic output per person.',
    unit: 'Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA / Census',
    apiSource: 'FRED', apiIdentifier: 'A939RX0Q048SBEA', chartType: 'line', calculation: 'NONE',
   },
   {
    id: 'CAPUTIL', name: 'Capacity Utilization', categoryKey: 'i',
    description: 'Measures the percentage of industrial capacity that is currently in use.',
    unit: '% of Capacity', frequency: 'Monthly', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'TCU', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'PRODUCTIVITY', name: 'Productivity (Output Per Hour)', categoryKey: 'i',
    description: 'Output per hour worked in the nonfarm business sector.',
    unit: 'Index 2012=100', frequency: 'Quarterly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'OPHNFB', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'LEI', name: 'Leading Economic Index (LEI)', categoryKey: 'i',
    description: 'Index designed by The Conference Board to predict future economic activity (typically 6-9 months ahead).',
    unit: 'Index', frequency: 'Monthly', sourceName: 'ConfBoard',
    apiSource: 'Mock', apiIdentifier: 'LEI', chartType: 'line', notes: 'Requires subscription, using Mock data.', calculation: 'NONE',
  },
  {
    id: 'LFPR', name: 'Labor Force Participation Rate', categoryKey: 'ii',
    description: 'The percentage of the working-age population that is either employed or actively looking for work.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'CIVPART', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'JOBLESSCLAIMS', name: 'Initial Jobless Claims', categoryKey: 'ii',
    description: 'The number of individuals who filed for unemployment insurance for the first time during the past week (Seasonally Adjusted).',
    unit: 'Number', frequency: 'Weekly', sourceName: 'DOL',
    apiSource: 'FRED', apiIdentifier: 'ICSA', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'JOLTS', name: 'JOLTS - Job Openings', categoryKey: 'ii',
    description: 'Total number of job openings on the last business day of the month (Seasonally Adjusted).',
    unit: 'Thousands', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'JTSJOL', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'ECI', name: 'Employment Cost Index (ECI)', categoryKey: 'ii',
    description: 'Measures changes in labor costs (wages, salaries, and employer costs for employee benefits) for civilian workers.',
    unit: '% Change YoY', frequency: 'Quarterly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'ECIALLCIV', chartType: 'bar', calculation: 'YOY_PERCENT', notes: 'Calculated from index level.',
  },
  {
    id: 'U6RATE', name: 'Underemployment Rate (U-6)', categoryKey: 'ii',
    description: 'Total unemployed, plus all persons marginally attached to the labor force, plus total employed part time for economic reasons, as a percent of the civilian labor force plus all persons marginally attached.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'U6RATE', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'QUITRATE', name: 'Quit Rate (JOLTS)', categoryKey: 'ii',
    description: 'Number of quits during the entire month as a percent of total employment.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'JTSQUR', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'HIRERATE', name: 'Hire Rate (JOLTS)', categoryKey: 'ii',
    description: 'Number of hires during the entire month as a percent of total employment.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS',
    apiSource: 'FRED', apiIdentifier: 'JTSHIR', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'OIL_WTI', name: 'Crude Oil Price (WTI)', categoryKey: 'iii',
    description: 'West Texas Intermediate crude oil spot price.',
    unit: 'USD per Barrel', frequency: 'Daily', sourceName: 'EIA',
    apiSource: 'FRED', apiIdentifier: 'WTISPLC', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'INFL_EXPECT_UMICH', name: 'Inflation Expectations (UMich 1-Year)', categoryKey: 'iii',
    description: 'Median expected price change next 12 months from the University of Michigan Survey of Consumers.',
    unit: '%', frequency: 'Monthly', sourceName: 'UMich',
    apiSource: 'FRED', apiIdentifier: 'MICH', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'TIPS_BREAKEVEN_5Y', name: 'TIPS Breakeven Inflation Rate (5-Year)', categoryKey: 'iii',
    description: 'The difference between the yield on a nominal Treasury bond and a Treasury Inflation-Protected Security (TIPS) of the same maturity.',
    unit: '%', frequency: 'Daily', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'T5YIE', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'CCI', name: 'Consumer Confidence Index (CCI)', categoryKey: 'iv',
    description: 'The Conference Board\'s measure of consumer optimism about the economy and personal finances.',
    unit: 'Index 1985=100', frequency: 'Monthly', sourceName: 'ConfBoard',
    apiSource: 'Mock', apiIdentifier: 'CCI', chartType: 'line', notes: 'Requires subscription, using Mock data.', calculation: 'NONE',
  },
   {
    id: 'UMCSENT', name: 'Consumer Sentiment Index (UMich)', categoryKey: 'iv',
    description: 'University of Michigan\'s index measuring consumer sentiment.',
    unit: 'Index Q1 1966=100', frequency: 'Monthly', sourceName: 'UMich',
    apiSource: 'FRED', apiIdentifier: 'UMCSENT', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'VEHICLE_SALES', name: 'Light Weight Vehicle Sales', categoryKey: 'iv',
    description: 'Total sales of new lightweight vehicles (cars and light trucks) in the U.S. (Seasonally Adjusted Annual Rate).',
    unit: 'Millions of Units (SAAR)', frequency: 'Monthly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'ALTSALES', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'SAVINGS_RATE', name: 'Personal Savings Rate', categoryKey: 'iv',
    description: 'Personal saving as a percentage of disposable personal income (DPI).',
    unit: '%', frequency: 'Monthly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'PSAVERT', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'CC_DELINQUENCY', name: 'Credit Card Delinquency Rate', categoryKey: 'iv',
    description: 'Delinquency rate on credit card loans from all commercial banks.',
    unit: '% (SA)', frequency: 'Quarterly', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'DRCCLACBS', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'PMI', name: 'ISM Manufacturing PMI', categoryKey: 'v',
    description: 'Purchasing Managers\' Index based on a survey of manufacturing firms. Above 50 indicates expansion, below 50 indicates contraction.',
    unit: 'Index', frequency: 'Monthly', sourceName: 'ISM',
    apiSource: 'FRED', apiIdentifier: 'NAPM', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'PMI_SERVICES', name: 'ISM Services PMI', categoryKey: 'v',
    description: 'Purchasing Managers\' Index based on a survey of non-manufacturing (services) firms. Above 50 indicates expansion, below 50 indicates contraction.',
    unit: 'Index', frequency: 'Monthly', sourceName: 'ISM',
    apiSource: 'FRED', apiIdentifier: 'NMFCI', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'NONRES_INVESTMENT', name: 'Nonresidential Fixed Investment', categoryKey: 'v',
    description: 'Spending by businesses on structures, equipment, and intellectual property products.',
    unit: 'Billions of Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'PNFI', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'HOUSING_STARTS', name: 'Housing Starts', categoryKey: 'vi',
    description: 'The number of new residential construction projects that have begun during a month (Seasonally Adjusted Annual Rate).',
    unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'HOUST', chartType: 'area', calculation: 'NONE',
  },
  {
    id: 'BUILDING_PERMITS', name: 'Building Permits', categoryKey: 'vi',
    description: 'The number of permits authorized for new privately-owned housing units (Seasonally Adjusted Annual Rate).',
    unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'PERMIT', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'EXISTING_HOME_SALES', name: 'Existing Home Sales', categoryKey: 'vi',
    description: 'The number of closed sales of previously owned single-family homes, townhomes, condominiums, and co-ops (Seasonally Adjusted Annual Rate).',
    unit: 'Millions of Units (SAAR)', frequency: 'Monthly', sourceName: 'NAR',
    apiSource: 'FRED', apiIdentifier: 'EXHOSLUSM495S', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'PENDING_HOME_SALES', name: 'Pending Home Sales Index', categoryKey: 'vi',
    description: 'Index tracking homes under contract but not yet closed; a leading indicator for Existing Home Sales.',
    unit: 'Index 2001=100', frequency: 'Monthly', sourceName: 'NAR',
    apiSource: 'FRED', apiIdentifier: 'PENDING', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'NEW_HOME_SALES', name: 'New Home Sales', categoryKey: 'vi',
    description: 'The number of newly constructed single-family homes sold during the month (Seasonally Adjusted Annual Rate).',
    unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'HSN1F', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'HOUSING_AFFORD', name: 'Housing Affordability Index', categoryKey: 'vi',
    description: 'Measures whether a typical family earns enough income to qualify for a mortgage on a typical home (Fixed Rate).',
    unit: 'Index', frequency: 'Monthly', sourceName: 'NAR',
    apiSource: 'FRED', apiIdentifier: 'FIXHAI', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'MORTGAGE_DELINQUENCY', name: 'Mortgage Delinquency Rate', categoryKey: 'vi',
    description: 'Delinquency rate on single-family residential mortgages from all commercial banks.',
    unit: '% (SA)', frequency: 'Quarterly', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'DRSFRMACBS', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'RENTAL_VACANCY', name: 'Rental Vacancy Rate', categoryKey: 'vi',
    description: 'Percentage of rental housing units that are vacant and available for rent.',
    unit: '%', frequency: 'Quarterly', sourceName: 'Census',
    apiSource: 'FRED', apiIdentifier: 'RRVRUSQ156N', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'TRADE_BALANCE', name: 'Balance of Trade (Goods & Services)', categoryKey: 'vii',
    description: 'The difference between a country\'s total value of exports and its total value of imports.',
    unit: 'Billions of Dollars', frequency: 'Monthly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'BOPGSTB', chartType: 'bar', calculation: 'NONE',
  },
  {
    id: 'CURRENT_ACCOUNT', name: 'Current Account Balance', categoryKey: 'vii',
    description: 'A broad measure of a country\'s trade, including goods, services, investment income, and unilateral transfers.',
    unit: 'Billions of Dollars', frequency: 'Quarterly', sourceName: 'BEA',
    apiSource: 'FRED', apiIdentifier: 'BOPBCA', chartType: 'bar', calculation: 'NONE',
  },
  {
    id: 'FED_FUNDS', name: 'Federal Funds Effective Rate', categoryKey: 'viii',
    description: 'The interest rate at which depository institutions trade federal funds (balances held at Federal Reserve Banks) with each other overnight.',
    unit: '%', frequency: 'Daily', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'FEDFUNDS', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'US10Y', name: '10-Year Treasury Yield', categoryKey: 'viii',
    description: 'The yield on U.S. government debt obligations with a maturity of 10 years (Constant Maturity).',
    unit: '%', frequency: 'Daily', sourceName: 'Treasury',
    apiSource: 'FRED', apiIdentifier: 'DGS10', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'MORTGAGE_RATE', name: '30-Year Fixed Mortgage Rate', categoryKey: 'viii',
    description: 'Average 30-year fixed mortgage rate in the United States.',
    unit: '%', frequency: 'Weekly', sourceName: 'FreddieMac',
    apiSource: 'FRED', apiIdentifier: 'MORTGAGE30US', chartType: 'line', calculation: 'NONE',
   },
  {
    id: 'USD_EUR', name: 'USD/EUR Exchange Rate', categoryKey: 'viii',
    description: 'The value of 1 U.S. Dollar expressed in Euros.',
    unit: 'EUR per USD', frequency: 'Daily', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'DEXUSEU', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'VIX', name: 'Volatility Index (VIX)', categoryKey: 'viii',
    description: 'Measures market expectations of near-term volatility conveyed by S&P 500 stock index option prices.',
    unit: 'Index', frequency: 'Daily', sourceName: 'CBOE',
    apiSource: 'FRED', apiIdentifier: 'VIXCLS', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'CORP_BOND_SPREAD_BAA', name: 'Corporate Bond Spread (Baa)', categoryKey: 'viii',
    description: 'Difference between Moody\'s Seasoned Baa Corporate Bond Yield and the 10-Year Treasury Constant Maturity Rate.',
    unit: '%', frequency: 'Daily', sourceName: 'Moody\'s / Treasury',
    apiSource: 'FRED', apiIdentifier: 'BAA10Y', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'M2SL', name: 'M2 Money Stock', categoryKey: 'viii',
    description: 'Measure of the U.S. money supply that includes M1 (cash and checking deposits) as well as savings deposits, small time deposits, and retail money market funds.',
    unit: 'Billions of Dollars (SA)', frequency: 'Monthly', sourceName: 'FRB',
    apiSource: 'FRED', apiIdentifier: 'M2SL', chartType: 'area', calculation: 'NONE',
  },
];

// Helper functions (no changes here)
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
