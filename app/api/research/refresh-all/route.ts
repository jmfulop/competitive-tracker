import { NextResponse } from 'next/server';

const VENDORS = [
  'Oracle NetSuite',
  'SAP Business One',
  'SAP S/4HANA Cloud',
  'Microsoft Dynamics 365 Business Central',
  'Microsoft Dynamics 365 Finance',
  'Oracle Fusion Cloud ERP',
  'Workday',
  'Infor',
  'Epicor',
  'IFS',
  'Unit4',
  'Odoo',
  'WIISE',
  'Sage Intacct',
  'QAD Adaptive ERP',
  'Striven',
  'SYSPRO',
  'Campfire',
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const results = [];

  for (const vendor of VENDORS) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, forceRefresh: true }),
      });
      const data = await res.json();
      results.push({ vendor, score: data.result?.overall_score, ok: res.ok });
    } catch (err) {
      results.push({ vendor, ok: false, error: String(err) });
    }
    await sleep(3000);
  }

  return NextResponse.json({ success: true, results });
}