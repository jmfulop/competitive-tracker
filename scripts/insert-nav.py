lines = open('app/tracker/page.js', 'r', encoding='utf-8').readlines()

insert = [
    '              <div className="w-px bg-slate-700 mx-1 self-stretch" />\n',
    '              <a href="/signals" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><Radio size={15} />AI Signals</a>\n',
    '              <a href="/compare" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><GitCompare size={15} />Compare</a>\n',
    '              <a href="/battlecards" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><CreditCard size={15} />Battlecards</a>\n',
    '              <a href="/win-loss" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><Trophy size={15} />Win / Loss</a>\n',
    '              <a href="/activity" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><Activity size={15} />Activity</a>\n',
]

# Remove any existing inserted links
cleaned = []
skip = False
for line in lines:
    if 'w-px bg-slate-700' in line:
        skip = True
    if '</nav>' in line and skip:
        skip = False
        cleaned.append(line)
        continue
    if not skip:
        cleaned.append(line)

# Insert before </nav>
out = []
inserted = False
for i, line in enumerate(cleaned):
    if '</nav>' in line and i > 390 and not inserted:
        out.extend(insert)
        inserted = True
    out.append(line)

open('app/tracker/page.js', 'w', encoding='utf-8').writelines(out)
print(f'Done - inserted={inserted}')