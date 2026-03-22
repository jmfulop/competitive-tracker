lines = open('app/tracker/page.js', 'r', encoding='utf-8').readlines()

# Find the help section boundaries
start = None
end = None
for i, line in enumerate(lines):
    if 'What is this tracker?' in line and start is None:
        start = i - 1  # include the <div> before it
    if 'Useful Resources' in line and start is not None:
        # Find the closing </div> after Useful Resources
        for j in range(i, min(i + 20, len(lines))):
            if '</div>' in lines[j]:
                end = j + 1
                break
        break

print(f'Replacing lines {start} to {end}')

new_content = '''                <div>
                <h3 className="text-blue-500 font-semibold mb-2 flex items-center gap-2"><BarChart2 size={16} /> What is this tracker?</h3>
                <p className={`${t.textSub} text-sm leading-relaxed`}>A competitive intelligence tool for the Product Management team. It tracks how major ERP vendors are positioning their AI capabilities and helps spot early market trends. Use it to inform roadmap decisions, prepare executive briefings, and stay ahead of competitor moves.</p>
              </div>
              <div>
                <h3 className="text-blue-500 font-semibold mb-3 flex items-center gap-2"><BookOpen size={16} /> The tabs</h3>
                <div className="space-y-3">
                  {[
                    { tab: 'Dashboard', color: 'text-blue-500', desc: 'High-level view. Click KPI cards to filter Signals. Click any vendor card to jump to that vendor in the Editor.' },
                    { tab: 'Signals', color: 'text-purple-500', desc: 'Weak signals journal. Click "+ Log New Signal" to expand the form. Validated signals from the last 30 days surface on the Dashboard.' },
                    { tab: 'Editor', color: 'text-gray-500', desc: 'Manage vendor data - maturity, deployment status, pricing model, buyer persona, adoption signals, and Acumatica gap.' },
                    { tab: 'AI Signals', color: 'text-indigo-500', desc: 'AI-detected competitive signals from sources no one else is watching - job postings, changelogs, G2 reviews, pricing pages, developer docs. Runs automatically every morning at 6am AEST.' },
                    { tab: 'Compare', color: 'text-teal-500', desc: 'Side-by-side AI feature comparison across up to 4 vendors. Generate AI-powered battlecards for sales and positioning.' },
                    { tab: 'Battlecards', color: 'text-green-500', desc: 'Saved AI-generated positioning cards - versioned so you can track how positioning evolves over time.' },
                    { tab: 'Win / Loss', color: 'text-yellow-500', desc: 'Log deal outcomes and generate AI positioning playbooks based on your win/loss patterns.' },
                    { tab: 'Activity', color: 'text-orange-500', desc: 'Live feed of every AI operation across the tracker - research runs, signal detections, battlecard generations.' },
                  ].map(({ tab, color, desc }) => (
                    <div key={tab} className={`${t.row} rounded-lg p-3`}>
                      <div className={`font-semibold text-sm ${color} mb-1`}>{tab}</div>
                      <p className={`${t.textSub} text-sm leading-relaxed`}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-blue-500 font-semibold mb-2 flex items-center gap-2"><Shield size={16} /> Vendor intelligence fields</h3>
                <div className="space-y-2">
                  {[
                    { field: 'Deployment Status', desc: 'Is the AI actually in production, or just announced? Production > Beta > Announced > Roadmap.' },
                    { field: 'Pricing Model', desc: 'Included in licence, paid add-on, or consumption-based? Affects how it is sold and perceived.' },
                    { field: 'Implementation Complexity', desc: 'How hard is it to turn on? High complexity reduces real threat even if capability looks strong.' },
                    { field: 'Acumatica Gap', desc: 'Do we have this, is it on the roadmap, or a genuine gap? Fill this in manually - requires internal judgment.' },
                    { field: 'Buyer Persona', desc: 'Who is asking for this in deals - CFO, IT Admin, or end user?' },
                    { field: 'Adoption Signal', desc: 'Evidence of real uptake, not just availability. Low adoption despite availability is itself a signal.' },
                  ].map(({ field, desc }) => (
                    <div key={field} className="flex gap-3 text-sm">
                      <span className={`${t.text} font-medium w-44 shrink-0`}>{field}</span>
                      <span className={`${t.textSub} leading-relaxed`}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-blue-500 font-semibold mb-2 flex items-center gap-2"><Radio size={16} /> Logging weak signals</h3>
                <p className={`${t.textSub} text-sm leading-relaxed mb-3`}>Signals are logged <strong className={t.text}>manually</strong> in the Signals tab. Log as <strong className={t.text}>Monitoring</strong>, mark <strong className={t.text}>Validated</strong> if it proves true, or <strong className={t.text}>Invalidated</strong> if it does not.</p>
                <ul className="space-y-1.5">
                  {[
                    'A customer asks about a feature a competitor just announced',
                    'A vendor quietly changes their pricing or packaging',
                    'A partner starts recommending a competitor more often',
                    'An analyst mentions a market shift in passing',
                  ].map((ex, i) => (
                    <li key={i} className={`${t.textSub} text-sm flex items-start gap-2`}><span className="text-purple-500 mt-0.5">-&gt;</span>{ex}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-blue-500 font-semibold mb-2 flex items-center gap-2"><Cpu size={16} /> AI Update button</h3>
                <p className={`${t.textSub} text-sm leading-relaxed`}>Refreshes vendor capabilities and notes using Claude AI. PIN protected. Does not log signals - those are always manual.</p>
              </div>
              <div>
                <h3 className="text-blue-500 font-semibold mb-2 flex items-center gap-2"><Zap size={16} /> AI Detection</h3>
                <p className={`${t.textSub} text-sm leading-relaxed`}>Runs automatically at 6am AEST daily. Scans 18 vendors across job postings, changelogs, G2 reviews, pricing pages, developer docs and more. Each signal is triaged with urgency, recommended action, and roadmap implication. Go to AI Signals to view results or trigger manually.</p>
              </div>
'''

if start and end:
    lines = lines[:start] + [new_content] + lines[end:]
    open('app/tracker/page.js', 'w', encoding='utf-8').writelines(lines)
    print('Done! Help content updated.')
else:
    print(f'ERROR: Could not find boundaries. start={start}, end={end}')