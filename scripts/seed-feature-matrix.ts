import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SupportLevel = 'full' | 'partial' | 'roadmap' | 'none';
type Row = {
  vendor_name: string;
  category: string;
  feature_name: string;
  support_level: SupportLevel;
  notes: string;
};

const rows: Row[] = [
  // AI & Automation
  { vendor_name: 'MYOB Acumatica',                       category: 'AI & Automation', feature_name: 'AP Bill Recognition (OCR)',  support_level: 'full',    notes: 'GA - AWS Textract + Azure' },
  { vendor_name: 'MYOB Acumatica',                       category: 'AI & Automation', feature_name: 'Expense Receipt Capture',    support_level: 'full',    notes: 'Mobile + web' },
  { vendor_name: 'MYOB Acumatica',                       category: 'AI & Automation', feature_name: 'Anomaly Detection',          support_level: 'full',    notes: 'GL anomaly alerts' },
  { vendor_name: 'MYOB Acumatica',                       category: 'AI & Automation', feature_name: 'Intelligent Text',           support_level: 'full',    notes: 'Contextual field suggestions' },
  { vendor_name: 'MYOB Acumatica',                       category: 'AI & Automation', feature_name: 'Agentic Workflows',          support_level: 'roadmap', notes: 'H2 2025 roadmap' },

  { vendor_name: 'Oracle NetSuite',                      category: 'AI & Automation', feature_name: 'AP Bill Recognition (OCR)',  support_level: 'full',    notes: 'SuiteAnalytics + partner OCR' },
  { vendor_name: 'Oracle NetSuite',                      category: 'AI & Automation', feature_name: 'Expense Receipt Capture',    support_level: 'full',    notes: 'SuiteExpense mobile' },
  { vendor_name: 'Oracle NetSuite',                      category: 'AI & Automation', feature_name: 'Anomaly Detection',          support_level: 'partial', notes: 'Via SuiteAnalytics' },
  { vendor_name: 'Oracle NetSuite',                      category: 'AI & Automation', feature_name: 'Intelligent Text',           support_level: 'partial', notes: 'Limited to search/help' },
  { vendor_name: 'Oracle NetSuite',                      category: 'AI & Automation', feature_name: 'Agentic Workflows',          support_level: 'roadmap', notes: 'Oracle AI roadmap 2025' },

  { vendor_name: 'SAP Business One',                     category: 'AI & Automation', feature_name: 'AP Bill Recognition (OCR)',  support_level: 'partial', notes: 'Requires add-on partner' },
  { vendor_name: 'SAP Business One',                     category: 'AI & Automation', feature_name: 'Expense Receipt Capture',    support_level: 'partial', notes: 'Concur integration required' },
  { vendor_name: 'SAP Business One',                     category: 'AI & Automation', feature_name: 'Anomaly Detection',          support_level: 'none',    notes: 'Not available natively' },
  { vendor_name: 'SAP Business One',                     category: 'AI & Automation', feature_name: 'Intelligent Text',           support_level: 'partial', notes: 'Joule AI - limited B1 coverage' },
  { vendor_name: 'SAP Business One',                     category: 'AI & Automation', feature_name: 'Agentic Workflows',          support_level: 'none',    notes: 'Not on B1 roadmap' },

  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'AI & Automation', feature_name: 'AP Bill Recognition (OCR)',  support_level: 'full',    notes: 'Copilot embedded' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'AI & Automation', feature_name: 'Expense Receipt Capture',    support_level: 'full',    notes: 'Power Apps / Copilot' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'AI & Automation', feature_name: 'Anomaly Detection',          support_level: 'partial', notes: 'Via Power BI' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'AI & Automation', feature_name: 'Intelligent Text',           support_level: 'full',    notes: 'Copilot across all modules' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'AI & Automation', feature_name: 'Agentic Workflows',          support_level: 'partial', notes: 'Copilot agents early access' },

  // ANZ Compliance
  { vendor_name: 'MYOB Acumatica',                       category: 'ANZ Compliance', feature_name: 'STP Phase 2',       support_level: 'full',    notes: 'ATO certified' },
  { vendor_name: 'MYOB Acumatica',                       category: 'ANZ Compliance', feature_name: 'GST / BAS',         support_level: 'full',    notes: 'Native' },
  { vendor_name: 'MYOB Acumatica',                       category: 'ANZ Compliance', feature_name: 'Payday Filing NZ',  support_level: 'full',    notes: 'IRD certified' },
  { vendor_name: 'MYOB Acumatica',                       category: 'ANZ Compliance', feature_name: 'eInvoicing PEPPOL', support_level: 'full',    notes: 'ATO/MBIE network ready' },

  { vendor_name: 'Oracle NetSuite',                      category: 'ANZ Compliance', feature_name: 'STP Phase 2',       support_level: 'full',    notes: 'ANZ localisation bundle' },
  { vendor_name: 'Oracle NetSuite',                      category: 'ANZ Compliance', feature_name: 'GST / BAS',         support_level: 'full',    notes: 'ANZ tax bundle' },
  { vendor_name: 'Oracle NetSuite',                      category: 'ANZ Compliance', feature_name: 'Payday Filing NZ',  support_level: 'full',    notes: 'NZ localisation' },
  { vendor_name: 'Oracle NetSuite',                      category: 'ANZ Compliance', feature_name: 'eInvoicing PEPPOL', support_level: 'partial', notes: 'Partner-dependent' },

  { vendor_name: 'SAP Business One',                     category: 'ANZ Compliance', feature_name: 'STP Phase 2',       support_level: 'partial', notes: 'Partner payroll modules' },
  { vendor_name: 'SAP Business One',                     category: 'ANZ Compliance', feature_name: 'GST / BAS',         support_level: 'full',    notes: 'ANZ localisation' },
  { vendor_name: 'SAP Business One',                     category: 'ANZ Compliance', feature_name: 'Payday Filing NZ',  support_level: 'partial', notes: 'Add-on required' },
  { vendor_name: 'SAP Business One',                     category: 'ANZ Compliance', feature_name: 'eInvoicing PEPPOL', support_level: 'none',    notes: 'Not supported' },

  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'ANZ Compliance', feature_name: 'STP Phase 2',       support_level: 'partial', notes: 'Via ISV payroll add-ons' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'ANZ Compliance', feature_name: 'GST / BAS',         support_level: 'full',    notes: 'ANZ localisation pack' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'ANZ Compliance', feature_name: 'Payday Filing NZ',  support_level: 'partial', notes: 'ISV add-on required' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'ANZ Compliance', feature_name: 'eInvoicing PEPPOL', support_level: 'full',    notes: 'E-documents feature 2024' },

  // Financials
  { vendor_name: 'MYOB Acumatica',                       category: 'Financials', feature_name: 'Multi-currency',         support_level: 'full',    notes: '' },
  { vendor_name: 'MYOB Acumatica',                       category: 'Financials', feature_name: 'Multi-entity / Interco', support_level: 'full',    notes: '' },
  { vendor_name: 'MYOB Acumatica',                       category: 'Financials', feature_name: 'Project Accounting',     support_level: 'full',    notes: 'Native module' },

  { vendor_name: 'Oracle NetSuite',                      category: 'Financials', feature_name: 'Multi-currency',         support_level: 'full',    notes: '' },
  { vendor_name: 'Oracle NetSuite',                      category: 'Financials', feature_name: 'Multi-entity / Interco', support_level: 'full',    notes: 'OneWorld add-on' },
  { vendor_name: 'Oracle NetSuite',                      category: 'Financials', feature_name: 'Project Accounting',     support_level: 'full',    notes: '' },

  { vendor_name: 'SAP Business One',                     category: 'Financials', feature_name: 'Multi-currency',         support_level: 'full',    notes: '' },
  { vendor_name: 'SAP Business One',                     category: 'Financials', feature_name: 'Multi-entity / Interco', support_level: 'partial', notes: 'Add-on required' },
  { vendor_name: 'SAP Business One',                     category: 'Financials', feature_name: 'Project Accounting',     support_level: 'partial', notes: '' },

  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'Financials', feature_name: 'Multi-currency',         support_level: 'full', notes: '' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'Financials', feature_name: 'Multi-entity / Interco', support_level: 'full', notes: '' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'Financials', feature_name: 'Project Accounting',     support_level: 'full', notes: '' },

  // Deployment
  { vendor_name: 'MYOB Acumatica',                       category: 'Deployment', feature_name: 'SaaS hosted',           support_level: 'full',    notes: 'AU data residency' },
  { vendor_name: 'MYOB Acumatica',                       category: 'Deployment', feature_name: 'Customer cloud (AWS/Azure)', support_level: 'full', notes: '' },
  { vendor_name: 'MYOB Acumatica',                       category: 'Deployment', feature_name: 'On-premise',            support_level: 'full',    notes: '' },

  { vendor_name: 'Oracle NetSuite',                      category: 'Deployment', feature_name: 'SaaS hosted',           support_level: 'full',    notes: 'Oracle-hosted only' },
  { vendor_name: 'Oracle NetSuite',                      category: 'Deployment', feature_name: 'Customer cloud (AWS/Azure)', support_level: 'none', notes: 'Not available' },
  { vendor_name: 'Oracle NetSuite',                      category: 'Deployment', feature_name: 'On-premise',            support_level: 'none',    notes: 'Not available' },

  { vendor_name: 'SAP Business One',                     category: 'Deployment', feature_name: 'SaaS hosted',           support_level: 'partial', notes: 'SAP HANA Cloud' },
  { vendor_name: 'SAP Business One',                     category: 'Deployment', feature_name: 'Customer cloud (AWS/Azure)', support_level: 'full', notes: '' },
  { vendor_name: 'SAP Business One',                     category: 'Deployment', feature_name: 'On-premise',            support_level: 'full',    notes: '' },

  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'Deployment', feature_name: 'SaaS hosted',           support_level: 'full',    notes: 'Microsoft Cloud' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'Deployment', feature_name: 'Customer cloud (AWS/Azure)', support_level: 'partial', notes: 'Azure only' },
  { vendor_name: 'Microsoft Dynamics 365 Business Central', category: 'Deployment', feature_name: 'On-premise',            support_level: 'none',    notes: 'Discontinued' },
];

async function seed() {
  console.log(`Seeding ${rows.length} feature matrix rows...`);

  const { error } = await supabase
    .from('feature_matrix')
    .upsert(rows, { onConflict: 'vendor_name,feature_name', ignoreDuplicates: false });

  if (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} rows successfully`);
}

seed();