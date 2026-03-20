lines = open('app/tracker/page.js', 'r', encoding='utf-8').readlines()

insert = [
    '              <div className="w-px bg-slate-700 mx-1 self-stretch" />\n',
    '              <a href="/signals" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>AI Signals</a>\n',
    '              <a href="/compare" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Compare</a>\n',
    '              <a href="/battlecards" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Battlecards</a>\n',
    '              <a href="/win-loss" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Win / Loss</a>\n',
    '              <a href="/activity" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Activity</a>\n',
]

inserted = False
for i, line in enumerate(lines):
    if '</nav>' in line and i > 390:
        lines = lines[:i] + insert + lines[i:]
        inserted = True
        print(f'Inserted at line {i+1}')
        break

if inserted:
    open('app/tracker/page.js', 'w', encoding='utf-8').writelines(lines)
    print('Done!')
else:
    print('ERROR: Could not find insertion point')