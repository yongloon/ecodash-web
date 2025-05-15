// src/lib/indicators.ts
import { IconType } from 'react-icons';
import {
  FaChartLine, FaUsers, FaDollarSign, FaHome, FaIndustry, FaPlaneDeparture, FaCar, FaLandmark // Added FaLandmark for potential new category
} from 'react-icons/fa';
import { BsBank2 } from "react-icons/bs"; // For Financial Markets

export const indicatorCategories = {
  'i': { name: 'Economic Output & Growth', slug: 'economic-output', icon: FaChartLine },
  'ii': { name: 'Labor Market', slug: 'labor-market', icon: FaUsers },
  'iii': { name: 'Inflation & Prices', slug: 'inflation-prices', icon: FaDollarSign },
  'iv': { name: 'Consumer Activity', slug: 'consumer-activity', icon: FaCar },
  'v': { name: 'Business Activity & Investment', slug: 'business-activity', icon: FaIndustry },
  'vi': { name: 'Housing Market', slug: 'housing-market', icon: FaHome },
  'vii': { name: 'International Trade', slug: 'international-trade', icon: FaPlaneDeparture },
  'viii': { name: 'Financial Markets', slug: 'financial-markets', icon: BsBank2 },
  // Example for a potential new category:
  // 'ix': { name: 'Government & Fiscal Health', slug: 'government-fiscal', icon: FaLandmark },
} as const;

export type IndicatorCategoryKey = keyof typeof indicatorCategories;

export interface TimeSeriesDataPoint {
  date: string; // Expect "YYYY-MM-DD"
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
  apiSource: 'FRED' | 'AlphaVantage' | 'DBNOMICS' | 'Mock' | 'Other' | 'BLS' | 'BEA' | 'Census' | 'NAR' | 'FRB' | 'Treasury' | 'DOL' | 'ISM' | 'UMich' | 'ConfBoard' | 'CBOE' | 'S&P' | 'FreddieMac' | 'CoinGeckoAPI' | 'AlternativeMeAPI';
  apiIdentifier?: string;
  chartType?: 'line' | 'bar' | 'area';
  calculation?: CalculationType;
  notes?: string;
}

// Interfaces for FRED API (can be in api.ts or here for indicator context)
export interface FredObservation { date: string; value: string; }
export interface FredResponse { observations: FredObservation[]; }


export const indicators: IndicatorMetadata[] = [
  // == Category I: Economic Output & Growth ==
  {
    id: 'GDP_REAL', name: 'Real Gross Domestic Product', categoryKey: 'i',
    description: 'Measures the value of final goods and services produced within a country during a specific period, adjusted for inflation.',
    unit: 'Billions of Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'GDPC1', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'GDP_GROWTH', name: 'Real GDP Growth Rate', categoryKey: 'i',
    description: 'The percentage change in real GDP from the preceding period, annualized.',
    unit: '% Change (Annualized)', frequency: 'Quarterly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'A191RL1Q225SBEA', chartType: 'bar', calculation: 'NONE',
  },
  {
    id: 'INDPRO', name: 'Industrial Production Index', categoryKey: 'i',
    description: 'Measures the real output of manufacturing, mining, and electric and gas utilities.',
    unit: 'Index 2017=100', frequency: 'Monthly', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'INDPRO', chartType: 'area', calculation: 'NONE',
  },
  {
    id: 'GNP', name: 'Gross National Product', categoryKey: 'i',
    description: 'Measures the total income earned by a nation\'s people and businesses, including investment income earned abroad.',
    unit: 'Billions of Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'GNP', chartType: 'line', calculation: 'NONE',
   },
   {
    id: 'GDP_PER_CAPITA', name: 'Real GDP per Capita', categoryKey: 'i',
    description: 'Real Gross Domestic Product divided by the population; measures average economic output per person.',
    unit: 'Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA / Census via FRED',
    apiSource: 'FRED', apiIdentifier: 'A939RX0Q048SBEA', chartType: 'line', calculation: 'NONE',
   },
   {
    id: 'CAPUTIL', name: 'Capacity Utilization', categoryKey: 'i',
    description: 'Measures the percentage of industrial capacity that is currently in use.',
    unit: '% of Capacity', frequency: 'Monthly', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'TCU', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'PRODUCTIVITY', name: 'Productivity (Output Per Hour)', categoryKey: 'i',
    description: 'Output per hour worked in the nonfarm business sector.',
    unit: 'Index 2012=100', frequency: 'Quarterly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'OPHNFB', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'LEI', name: 'Leading Economic Index (LEI)', categoryKey: 'i',
    description: 'Index designed by The Conference Board to predict future economic activity (typically 6-9 months ahead).',
    unit: 'Index', frequency: 'Monthly', sourceName: 'The Conference Board',
    apiSource: 'Mock', apiIdentifier: 'LEI_MOCK', chartType: 'line', notes: 'Requires subscription, using Mock data.', calculation: 'NONE',
  },

  // == Category II: Labor Market ==
  {
    id: 'UNRATE', name: 'Unemployment Rate', categoryKey: 'ii',
    description: 'The percentage of the total labor force that is unemployed but actively seeking employment.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'UNRATE', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'PAYEMS_MOM_CHG', name: 'Non-Farm Payrolls (Monthly Change)', categoryKey: 'ii',
    description: 'The monthly change in the total number of paid U.S. workers, excluding farm and some government/nonprofit jobs.',
    unit: 'Thousands of Persons', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'PAYEMS', chartType: 'bar', calculation: 'MOM_CHANGE',
    notes: 'Calculated as month-over-month change from PAYEMS series.',
  },
  {
    id: 'AVGHRLY_YOY_PCT', name: 'Average Hourly Earnings (YoY %)', categoryKey: 'ii',
    description: 'Year-over-year percentage change in average hourly earnings of private sector production and nonsupervisory employees.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'CES0500000003', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated as YoY % change from level data.',
  },
  {
    id: 'LFPR', name: 'Labor Force Participation Rate', categoryKey: 'ii',
    description: 'The percentage of the working-age population that is either employed or actively looking for work.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'CIVPART', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'JOBLESSCLAIMS', name: 'Initial Jobless Claims', categoryKey: 'ii',
    description: 'The number of individuals who filed for unemployment insurance for the first time during the past week (Seasonally Adjusted).',
    unit: 'Number', frequency: 'Weekly', sourceName: 'DOL via FRED',
    apiSource: 'FRED', apiIdentifier: 'ICSA', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'JOLTS', name: 'JOLTS - Job Openings', categoryKey: 'ii',
    description: 'Total number of job openings on the last business day of the month (Seasonally Adjusted).',
    unit: 'Thousands', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'JTSJOL', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'ECI', name: 'Employment Cost Index (ECI)', categoryKey: 'ii',
    description: 'Measures changes in labor costs (wages, salaries, and employer costs for employee benefits) for civilian workers.',
    unit: '% Change YoY', frequency: 'Quarterly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'ECIALLCIV', chartType: 'bar', calculation: 'YOY_PERCENT', notes: 'Calculated from index level.',
  },
  {
    id: 'U6RATE', name: 'Underemployment Rate (U-6)', categoryKey: 'ii',
    description: 'Total unemployed, plus all persons marginally attached to the labor force, plus total employed part time for economic reasons, as a percent of the civilian labor force plus all persons marginally attached.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'U6RATE', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'QUITRATE', name: 'Quit Rate (JOLTS)', categoryKey: 'ii',
    description: 'Number of quits during the entire month as a percent of total employment.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'JTSQUR', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'HIRERATE', name: 'Hire Rate (JOLTS)', categoryKey: 'ii',
    description: 'Number of hires during the entire month as a percent of total employment.',
    unit: '%', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'JTSHIR', chartType: 'line', calculation: 'NONE',
  },

  // == Category III: Inflation & Prices ==
   {
    id: 'CPI_YOY_PCT', name: 'Consumer Price Index (CPI-U, YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the average price level of a basket of consumer goods and services purchased by urban households.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'CPIAUCSL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from CPIAUCSL index.',
  },
   {
    id: 'CORE_CPI_YOY_PCT', name: 'Core CPI (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in CPI excluding volatile food and energy components.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'CPILFESL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from CPILFESL index.',
  },
  {
    id: 'PPI_YOY_PCT', name: 'Producer Price Index (Final Demand, YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the average selling prices received by domestic producers for their output (Final Demand).',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'PPIACO', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from PPIACO index.',
  },
  {
    id: 'PCE_YOY_PCT', name: 'PCE Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the price index for Personal Consumption Expenditures.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'PCEPI', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from PCEPI index.',
  },
   {
    id: 'CORE_PCE_YOY_PCT', name: 'Core PCE Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the PCE Price Index excluding food and energy.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'PCEPILFE', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from PCEPILFE index.',
  },
  {
    id: 'GDPDEF_YOY_PCT', name: 'GDP Deflator (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the measure of the level of prices of all new, domestically produced, final goods and services in an economy.',
    unit: '% Change YoY', frequency: 'Quarterly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'GDPDEF', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from GDPDEF index.',
  },
  {
    id: 'IMPORT_PRICES_YOY_PCT', name: 'Import Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the prices of goods purchased from abroad by U.S. residents.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'IR', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from Import Price Index (All Commodities).',
  },
  {
    id: 'EXPORT_PRICES_YOY_PCT', name: 'Export Price Index (YoY %)', categoryKey: 'iii',
    description: 'Year-over-year percentage change in the prices of goods sold abroad by U.S. residents.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'BLS via FRED',
    apiSource: 'FRED', apiIdentifier: 'IQ', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from Export Price Index (All Commodities).',
  },
  {
    id: 'OIL_WTI', name: 'Crude Oil Price (WTI)', categoryKey: 'iii',
    description: 'West Texas Intermediate crude oil spot price.',
    unit: 'USD per Barrel', frequency: 'Daily', sourceName: 'EIA via FRED',
    apiSource: 'FRED', apiIdentifier: 'WTISPLC', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'INFL_EXPECT_UMICH', name: 'Inflation Expectations (UMich 1-Year)', categoryKey: 'iii',
    description: 'Median expected price change next 12 months from the University of Michigan Survey of Consumers.',
    unit: '%', frequency: 'Monthly', sourceName: 'University of Michigan via FRED',
    apiSource: 'FRED', apiIdentifier: 'MICH', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'TIPS_BREAKEVEN_5Y', name: 'TIPS Breakeven Inflation Rate (5-Year)', categoryKey: 'iii',
    description: 'The difference between the yield on a nominal Treasury bond and a Treasury Inflation-Protected Security (TIPS) of the same maturity.',
    unit: '%', frequency: 'Daily', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'T5YIE', chartType: 'line', calculation: 'NONE',
  },

  // == Category IV: Consumer Activity ==
  {
    id: 'RETAIL_SALES_MOM_PCT', name: 'Retail Sales (Advance, MoM %)', categoryKey: 'iv',
    description: 'Month-over-month percentage change in estimated sales for retail and food services firms.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'RSAFS', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from RSAFS level data.',
  },
  {
    id: 'PERS_INC_MOM_PCT', name: 'Personal Income (MoM %)', categoryKey: 'iv',
    description: 'Month-over-month percentage change in income received by individuals from all sources.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'PI', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from PI level data.',
  },
  {
    id: 'PERS_OUTLAYS_MOM_PCT', name: 'Personal Outlays (PCE, MoM %)', categoryKey: 'iv',
    description: 'Month-over-month percentage change in personal consumption expenditures (PCE), interest payments, and transfer payments.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'PCE', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from PCE level data.',
  },
  {
    id: 'CONSUMER_CREDIT_YOY_PCT', name: 'Consumer Credit Outstanding (YoY %)', categoryKey: 'iv',
    description: 'Year-over-year percentage change in total outstanding consumer debt (revolving and non-revolving).',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'TOTALSL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from TOTALSL level data.',
  },
  {
    id: 'CCI', name: 'Consumer Confidence Index (CCI)', categoryKey: 'iv',
    description: 'The Conference Board\'s measure of consumer optimism about the economy and personal finances.',
    unit: 'Index 1985=100', frequency: 'Monthly', sourceName: 'The Conference Board',
    apiSource: 'Mock', apiIdentifier: 'CCI_MOCK', chartType: 'line', notes: 'Requires subscription, using Mock data.', calculation: 'NONE',
  },
   {
    id: 'UMCSENT', name: 'Consumer Sentiment Index (UMich)', categoryKey: 'iv',
    description: 'University of Michigan\'s index measuring consumer sentiment.',
    unit: 'Index Q1 1966=100', frequency: 'Monthly', sourceName: 'University of Michigan via FRED',
    apiSource: 'FRED', apiIdentifier: 'UMCSENT', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'VEHICLE_SALES', name: 'Light Weight Vehicle Sales', categoryKey: 'iv',
    description: 'Total sales of new lightweight vehicles (cars and light trucks) in the U.S. (Seasonally Adjusted Annual Rate).',
    unit: 'Millions of Units (SAAR)', frequency: 'Monthly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'ALTSALES', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'SAVINGS_RATE', name: 'Personal Savings Rate', categoryKey: 'iv',
    description: 'Personal saving as a percentage of disposable personal income (DPI).',
    unit: '%', frequency: 'Monthly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'PSAVERT', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'CC_DELINQUENCY', name: 'Credit Card Delinquency Rate', categoryKey: 'iv',
    description: 'Delinquency rate on credit card loans from all commercial banks.',
    unit: '% (SA)', frequency: 'Quarterly', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'DRCCLACBS', chartType: 'line', calculation: 'NONE',
  },

  // == Category V: Business Activity & Investment ==
  {
    id: 'PMI',
    name: 'ISM Manufacturing PMI (DB.nomics)', // Or 'Chicago Fed National Activity Index (CFNAI)' if you reverted
    categoryKey: 'v',
    description: 'The ISM Manufacturing Purchasing Managers’ Index (PMI). Above 50 indicates expansion.',
    unit: 'Index', frequency: 'Monthly', sourceName: 'ISM via DB.nomics', // Or 'FRED'
    sourceLink: 'https://db.nomics.world/ISM/pmi', // Or FRED link for CFNAI
    apiSource: 'DBNOMICS', // Or 'FRED'
    apiIdentifier: 'ISM/pmi/TOTAL', // Or 'CFNAI' <<< VERIFY DB.NOMICS ID
    chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'PMI_SERVICES',
    name: 'ISM Services PMI (DB.nomics)', // Or 'Durable Goods New Orders (Ex-Trans, MoM %)'
    categoryKey: 'v',
    description: 'The ISM Services Purchasing Managers’ Index (PMI). Above 50 indicates expansion.',
    unit: 'Index', frequency: 'Monthly', sourceName: 'ISM via DB.nomics', // Or 'FRED'
    sourceLink: 'https://db.nomics.world/ISM/non-manufacturing-pmi', // Or FRED link
    apiSource: 'DBNOMICS', // Or 'FRED'
    apiIdentifier: 'ISM/non-manufacturing-pmi/TOTAL', // Or 'ADXTNO' <<< VERIFY DB.NOMICS ID
    chartType: 'line', calculation: 'NONE', // Or 'MOM_PERCENT' for ADXTNO
  },
  {
    id: 'DUR_GOODS_MOM_PCT', name: 'Durable Goods Orders (New Orders, MoM %)', categoryKey: 'v',
    description: 'Month-over-month percentage change in new orders received by manufacturers of goods planned to last three years or more.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'DGORDER', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from DGORDER level data. This includes transportation.',
  },
  {
    id: 'FACTORY_ORDERS_MOM_PCT', name: 'Factory Orders (MoM %)', categoryKey: 'v',
    description: 'Month-over-month percentage change in new orders for manufactured goods (durable and non-durable).',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'AMTMNO', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from AMTMNO level data.',
  },
  {
    id: 'BUS_INVENTORIES_MOM_PCT', name: 'Business Inventories (MoM %)', categoryKey: 'v',
    description: 'Month-over-month percentage change in the total value of inventories held by manufacturers, wholesalers, and retailers.',
    unit: '% Change MoM', frequency: 'Monthly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'BUSINV', chartType: 'bar', calculation: 'MOM_PERCENT',
    notes: 'Calculated from BUSINV level data.',
  },
  {
    id: 'CORP_PROFITS_QOQ_PCT', name: 'Corporate Profits After Tax (QoQ %)', categoryKey: 'v',
    description: 'Quarter-over-quarter percentage change in the net profits of corporations after taxes.',
    unit: '% Change QoQ', frequency: 'Quarterly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'CP', chartType: 'bar', calculation: 'QOQ_PERCENT',
    notes: 'Calculated from CP level data.',
  },
  {
    id: 'NONRES_INVESTMENT', name: 'Nonresidential Fixed Investment', categoryKey: 'v',
    description: 'Spending by businesses on structures, equipment, and intellectual property products.',
    unit: 'Billions of Chained 2017 Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'PNFI', chartType: 'line', calculation: 'NONE',
  },

  // == Category VI: Housing Market ==
  {
    id: 'CASE_SHILLER_YOY_PCT', name: 'S&P Case-Shiller Home Price Index (YoY %)', categoryKey: 'vi',
    description: 'Year-over-year percentage change in a leading measure of U.S. residential real estate prices (National Index).',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'S&P via FRED',
    apiSource: 'FRED', apiIdentifier: 'CSUSHPINSA', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from CSUSHPINSA index.',
  },
  {
    id: 'HOUSING_STARTS', name: 'Housing Starts', categoryKey: 'vi',
    description: 'The number of new residential construction projects that have begun during a month (Seasonally Adjusted Annual Rate).',
    unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'HOUST', chartType: 'area', calculation: 'NONE',
  },
  {
    id: 'BUILDING_PERMITS', name: 'Building Permits', categoryKey: 'vi',
    description: 'The number of permits authorized for new privately-owned housing units (Seasonally Adjusted Annual Rate).',
    unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'PERMIT', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'EXISTING_HOME_SALES', name: 'Existing Home Sales', categoryKey: 'vi',
    description: 'The number of closed sales of previously owned single-family homes, townhomes, condominiums, and co-ops (Seasonally Adjusted Annual Rate).',
    unit: 'Millions of Units (SAAR)', frequency: 'Monthly', sourceName: 'NAR via FRED',
    apiSource: 'FRED', apiIdentifier: 'EXHOSLUSM495S', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'PENDING_HOME_SALES', name: 'Pending Home Sales Index', categoryKey: 'vi',
    description: 'Index tracking homes under contract but not yet closed; a leading indicator for Existing Home Sales.',
    unit: 'Index 2001=100', frequency: 'Monthly', sourceName: 'NAR via FRED',
    apiSource: 'FRED', apiIdentifier: 'PENDING', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'NEW_HOME_SALES', name: 'New Home Sales', categoryKey: 'vi',
    description: 'The number of newly constructed single-family homes sold during the month (Seasonally Adjusted Annual Rate).',
    unit: 'Thousands of Units (SAAR)', frequency: 'Monthly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'HSN1F', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'HOUSING_AFFORD', name: 'Housing Affordability Index', categoryKey: 'vi',
    description: 'Measures whether a typical family earns enough income to qualify for a mortgage on a typical home (Fixed Rate).',
    unit: 'Index', frequency: 'Monthly', sourceName: 'NAR via FRED',
    apiSource: 'FRED', apiIdentifier: 'FIXHAI', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'MORTGAGE_DELINQUENCY', name: 'Mortgage Delinquency Rate', categoryKey: 'vi',
    description: 'Delinquency rate on single-family residential mortgages from all commercial banks.',
    unit: '% (SA)', frequency: 'Quarterly', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'DRSFRMACBS', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'RENTAL_VACANCY', name: 'Rental Vacancy Rate', categoryKey: 'vi',
    description: 'Percentage of rental housing units that are vacant and available for rent.',
    unit: '%', frequency: 'Quarterly', sourceName: 'U.S. Census Bureau via FRED',
    apiSource: 'FRED', apiIdentifier: 'RRVRUSQ156N', chartType: 'line', calculation: 'NONE',
  },

  // == Category VII: International Trade ==
  {
    id: 'TRADE_BALANCE', name: 'Balance of Trade (Goods & Services)', categoryKey: 'vii',
    description: 'The difference between a country\'s total value of exports and its total value of imports.',
    unit: 'Billions of Dollars', frequency: 'Monthly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'BOPGSTB', chartType: 'bar', calculation: 'NONE',
  },
  {
    id: 'CURRENT_ACCOUNT', name: 'Current Account Balance', categoryKey: 'vii',
    description: 'A broad measure of a country\'s trade, including goods, services, investment income, and unilateral transfers.',
    unit: 'Billions of Dollars', frequency: 'Quarterly', sourceName: 'BEA via FRED',
    apiSource: 'FRED', apiIdentifier: 'BOPBCA', chartType: 'bar', calculation: 'NONE',
  },

  // == Category VIII: Financial Markets ==
  {
    id: 'SP500', name: 'S&P 500 Index', categoryKey: 'viii',
    description: 'Tracks stock performance of 500 large U.S. companies.',
    unit: 'Index Value', frequency: 'Daily', sourceName: 'S&P Dow Jones Indices via FRED',
    apiSource: 'FRED', apiIdentifier: 'SP500', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'M2_YOY_PCT', name: 'M2 Money Stock (YoY %)', categoryKey: 'viii',
    description: 'Year-over-year percentage change in the M2 money stock.',
    unit: '% Change YoY', frequency: 'Monthly', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'M2SL', chartType: 'bar', calculation: 'YOY_PERCENT',
    notes: 'Calculated from M2SL level data.',
  },
  {
    id: 'FED_FUNDS', name: 'Federal Funds Effective Rate', categoryKey: 'viii',
    description: 'The interest rate at which depository institutions trade federal funds overnight.',
    unit: '%', frequency: 'Daily', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'FEDFUNDS', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'US10Y', name: '10-Year Treasury Yield', categoryKey: 'viii',
    description: 'The yield on U.S. government debt obligations with a maturity of 10 years.',
    unit: '%', frequency: 'Daily', sourceName: 'U.S. Treasury via FRED',
    apiSource: 'FRED', apiIdentifier: 'DGS10', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'MORTGAGE_RATE', name: '30-Year Fixed Mortgage Rate', categoryKey: 'viii',
    description: 'Average 30-year fixed mortgage rate in the United States.',
    unit: '%', frequency: 'Weekly', sourceName: 'Freddie Mac via FRED',
    apiSource: 'FRED', apiIdentifier: 'MORTGAGE30US', chartType: 'line', calculation: 'NONE',
   },
  {
    id: 'USD_EUR', name: 'USD/EUR Exchange Rate', categoryKey: 'viii',
    description: 'The value of 1 U.S. Dollar expressed in Euros.',
    unit: 'EUR per USD', frequency: 'Daily', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'DEXUSEU', chartType: 'line', calculation: 'NONE',
  },
   {
    id: 'VIX', name: 'Volatility Index (VIX)', categoryKey: 'viii',
    description: 'Measures market expectations of near-term volatility via S&P 500 options.',
    unit: 'Index', frequency: 'Daily', sourceName: 'CBOE via FRED',
    apiSource: 'FRED', apiIdentifier: 'VIXCLS', chartType: 'line', calculation: 'NONE',
  },
 /*  {
    id: 'CORP_BOND_SPREAD_BAA', name: 'Corporate Bond Spread (Baa)', categoryKey: 'viii',
    description: 'Difference between Moody\'s Seasoned Baa Corporate Bond Yield and the 10-Year Treasury Rate.',
    unit: '%', frequency: 'Daily', sourceName: 'Moody\'s/Treasury via FRED',
    apiSource: 'FRED', apiIdentifier: 'BAA10Y', chartType: 'line', calculation: 'NONE',
  }, */
   {
    id: 'M2SL', name: 'M2 Money Stock (Level)', categoryKey: 'viii', // Keep this if you want the level too
    description: 'Measure of the U.S. money supply (M1 + savings deposits, small time deposits, retail money funds).',
    unit: 'Billions of Dollars (SA)', frequency: 'Monthly', sourceName: 'FRB via FRED',
    apiSource: 'FRED', apiIdentifier: 'M2SL', chartType: 'area', calculation: 'NONE',
  },
  {
    id: 'BTC_PRICE_USD', name: 'Bitcoin Price (USD)', categoryKey: 'viii',
    description: 'Daily closing price of Bitcoin in US Dollars.',
    unit: 'USD', frequency: 'Daily', sourceName: 'CoinGecko',
    apiSource: 'CoinGeckoAPI', apiIdentifier: 'bitcoin', chartType: 'line', calculation: 'NONE',
  },
  {
    id: 'CRYPTO_FEAR_GREED', name: 'Crypto Fear & Greed Index', categoryKey: 'viii',
    description: 'Measures current sentiment in the Bitcoin and broader cryptocurrency market (0=Extreme Fear, 100=Extreme Greed).',
    unit: 'Index (0-100)', frequency: 'Daily', sourceName: 'Alternative.me',
    apiSource: 'AlternativeMeAPI', apiIdentifier: 'fear-and-greed', chartType: 'line', calculation: 'NONE',
  },
  // Indicators for Asset Risk Section
 {
    id: 'GOLD_PRICE',
    name: 'Spot Gold Price (AlphaVantage)',
    categoryKey: 'viii', // Or 'iii' or a 'Commodities' category
    description: 'Attempting to fetch spot gold price (XAU/USD) via Alpha Vantage. May fall back to GLD ETF if direct spot is unavailable/unreliable on free tier.',
    unit: 'USD per Troy Ounce', // This is the ideal unit. GLD would be USD per share.
    frequency: 'Real-time/Delayed',
    sourceName: 'Alpha Vantage',
    apiSource: 'AlphaVantage',
    apiIdentifier: 'XAU/USD', // <<< TRYING THIS for CURRENCY_EXCHANGE_RATE. Fallback: 'GLD' for ETF.
    chartType: 'line',
    calculation: 'NONE',
    notes: 'Data from Alpha Vantage. Spot price reliability on free tier may vary. GLD ETF is a close proxy.'
  },
  {
    id: 'BAA_YIELD', name: 'Moody\'s Baa Corporate Bond Yield', categoryKey: 'viii',
    description: 'Yield on Moody\'s Seasoned Baa Corporate Bonds.',
    unit: '%', frequency: 'Daily', sourceName: 'Moody\'s via FRED',
    apiSource: 'FRED', apiIdentifier: 'DBAA', chartType: 'line', calculation: 'NONE',
  },


  {
    id: 'T10Y2Y_SPREAD',
    name: '10-Year Minus 2-Year Treasury Spread',
    categoryKey: 'viii',
    description: 'The difference between the 10-year and 2-year Treasury constant maturity rates. Often used as a recession indicator.',
    unit: '%',
    frequency: 'Daily',
    sourceName: 'Federal Reserve Board via FRED',
    apiSource: 'FRED',
    apiIdentifier: 'T10Y2Y',
    chartType: 'area', // Good for spreads around zero
    calculation: 'NONE',
    notes: 'Negative values have historically preceded recessions.'
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