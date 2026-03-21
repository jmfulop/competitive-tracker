content = open('app/tracker/page.js', 'r', encoding='utf-8').read()

# Fix the lucide import to add missing icons
old = "import { Plus, Trash2, Download, Edit2, RefreshCw, Radio, AlertTriangle, TrendingUp, Shield, Zap, X, HelpCircle, BookOpen, BarChart2, Cpu, CheckCircle, PenLine, Sun, Moon } from 'lucide-react';"
new = "import { Plus, Trash2, Download, Edit2, RefreshCw, Radio, AlertTriangle, TrendingUp, Shield, Zap, X, HelpCircle, BookOpen, BarChart2, Cpu, CheckCircle, PenLine, Sun, Moon, GitCompare, CreditCard, TrophyIcon as Trophy, Activity } from 'lucide-react';"

if old in content:
    content = content.replace(old, new)
    open('app/tracker/page.js', 'w', encoding='utf-8').write(content)
    print('SUCCESS - imports fixed')
else:
    # Print the actual import line so we can see it
    for line in content.split('\n'):
        if 'lucide-react' in line:
            print('FOUND:', repr(line))
            break
    print('NOT FOUND - check above for actual import line')