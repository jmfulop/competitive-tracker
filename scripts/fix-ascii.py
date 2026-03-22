content = open('app/tracker/page.js', 'r', encoding='utf-8').read()

fixes = [
    ('┬À',      '·'),    # middle dot
    ('Ôåù',     '✗'),    # cross
    ('Ôåô',     '↓'),    # down arrow
    ('ÔòÉÔòÉ', '══'),   # double line
    ('ÔòÉ',     '═'),    # single double line
    ('ÔÇö',     '—'),    # em dash
    ('Ô£à',     '✓'),    # check
    ('\ufeff',  ''),      # BOM
    ('ÔÅ▒',    '→'),    # arrow
    ('Ôû╝',    ''),      # box char
    ('Ôû▓',    ''),      # box char
    ('\xadƒÄ»', '→'),   # arrow variant
    ('\xadƒôÄ', '💡'),  # lightbulb
    ('\xadƒæñ', '👤'),  # person
    ('\xadƒôè', '📎'),  # paperclip
]

for old, new in fixes:
    content = content.replace(old, new)

open('app/tracker/page.js', 'w', encoding='utf-8').write(content)
print('Done!')