content = open('app/tracker/page.js', 'r', encoding='utf-8').read()

# 1. Add missing icon imports
old_import = "import { Plus, Trash2, Download, Edit2, RefreshCw, Radio, AlertTriangle, TrendingUp, Shield, Zap, X, HelpCircle, BookOpen, BarChart2, Cpu, CheckCircle, PenLine, Sun, Moon } from 'lucide-react';"
new_import = "import { Plus, Trash2, Download, Edit2, RefreshCw, Radio, AlertTriangle, TrendingUp, Shield, Zap, X, HelpCircle, BookOpen, BarChart2, Cpu, CheckCircle, PenLine, Sun, Moon, GitCompare, CreditCard, Activity, Trophy } from 'lucide-react';"
content = content.replace(old_import, new_import)

# 2. Replace plain anchor links with icon versions
replacements = [
    (
        '<a href="/signals" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>AI Signals</a>',
        '<a href="/signals" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><Radio size={15} />AI Signals</a>'
    ),
    (
        '<a href="/compare" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Compare</a>',
        '<a href="/compare" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><GitCompare size={15} />Compare</a>'
    ),
    (
        '<a href="/battlecards" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Battlecards</a>',
        '<a href="/battlecards" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><CreditCard size={15} />Battlecards</a>'
    ),
    (
        '<a href="/win-loss" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Win / Loss</a>',
        '<a href="/win-loss" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><Trophy size={15} />Win / Loss</a>'
    ),
    (
        '<a href="/activity" className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}>Activity</a>',
        '<a href="/activity" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${t.navBtn}`}><Activity size={15} />Activity</a>'
    ),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f'Replaced: {old[:50]}...')
    else:
        print(f'NOT FOUND: {old[:50]}...')

open('app/tracker/page.js', 'w', encoding='utf-8').write(content)
print('Done!')