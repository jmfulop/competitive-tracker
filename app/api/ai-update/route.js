import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VENDOR_NAMES = ['NetSuite', 'SAP S/4HANA Cloud', 'Microsoft Dynamics 365', 'Oracle Cloud ERP'];

export async function POST() {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for the latest AI capabilities and news (last 30 days) for these ERP vendors.

You MUST use these EXACT names in your response:
- "NetSuite"
- "SAP S/4HANA Cloud"
- "Microsoft Dynamics 365"
- "Oracle Cloud ERP"

Return ONLY a valid JSON array with no other text, no markdown, no code blocks:
[
  {
    "name": "NetSuite",
    "ai_maturity": "Limited",
    "capabilities": ["capability 1", "capability 2", "capability 3"],
    "implementation_claims": "Brief description of their AI claims in 1-2 sentences",
    "notes": "Strategic assessment in 2-3 sentences",
    "sources": ["source title or url 1", "source title or url 2"]
  },
  {
    "name": "SAP S/4HANA Cloud",
    "ai_maturity": "Ambitious",
    "capabilities": ["capability 1", "capability 2", "capability 3"],
    "implementation_claims": "Brief description",
    "notes": "Strategic assessment",
    "sources": ["source 1", "source 2"]
  },
  {
    "name": "Microsoft Dynamics 365",
    "ai_maturity": "Advanced",
    "capabilities": ["capability 1", "capability 2", "capability 3"],
    "implementation_claims": "Brief description",
    "notes": "Strategic assessment",
    "sources": ["source 1", "source 2"]
  },
  {
    "name": "Oracle Cloud ERP",
    "ai_maturity": "Limited",
    "capabilities": ["capability 1", "capability 2", "capability 3"],
    "implementation_claims": "Brief description",
    "notes": "Strategic assessment",
    "sources": ["source 1", "source 2"]
  }
]

ai_maturity must be one of: "Limited", "Developing", "Advanced", "Ambitious"`
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Strip any markdown code blocks if present
    const cleaned = text.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return Response.json({ error: 'Could not parse vendor data', raw: text }, { status: 500 });
    }

    const vendors = JSON.parse(jsonMatch[0]);

    const results = [];
    for (const vendor of vendors) {
      // Only process known vendor names
      if (!VENDOR_NAMES.includes(vendor.name)) continue;

      const { data: existing } = await supabase
        .from('vendors')
        .select('id')
        .eq('name', vendor.name)
        .single();

      if (existing) {
        // Update vendor core fields
        await supabase
          .from('vendors')
          .update({
            ai_maturity: vendor.ai_maturity,
            implementation_claims: vendor.implementation_claims,
            notes: vendor.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        // Replace capabilities
        await supabase.from('capabilities').delete().eq('vendor_id', existing.id);
        if (vendor.capabilities?.length) {
          await supabase.from('capabilities').insert(
            vendor.capabilities.map(cap => ({ vendor_id: existing.id, capability: cap }))
          );
        }

        // Replace sources
        await supabase.from('sources').delete().eq('vendor_id', existing.id);
        if (vendor.sources?.length) {
          await supabase.from('sources').insert(
            vendor.sources.map(src => ({ vendor_id: existing.id, source: src }))
          );
        }

        results.push({ vendor: vendor.name, action: 'updated' });
      } else {
        // Insert new vendor
        const { data: newVendor } = await supabase
          .from('vendors')
          .insert({
            name: vendor.name,
            ai_maturity: vendor.ai_maturity,
            implementation_claims: vendor.implementation_claims,
            notes: vendor.notes,
          })
          .select()
          .single();

        if (newVendor) {
          if (vendor.capabilities?.length) {
            await supabase.from('capabilities').insert(
              vendor.capabilities.map(cap => ({ vendor_id: newVendor.id, capability: cap }))
            );
          }
          if (vendor.sources?.length) {
            await supabase.from('sources').insert(
              vendor.sources.map(src => ({ vendor_id: newVendor.id, source: src }))
            );
          }
        }

        results.push({ vendor: vendor.name, action: 'inserted' });
      }
    }

    return Response.json({ success: true, results, vendorCount: results.length });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}