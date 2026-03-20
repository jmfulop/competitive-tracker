content = open('app/tracker/page.js', 'r', encoding='utf-8').read()

replacements = [
    # BOM
    ('\ufeff', ''),
    # Arrow / bullet sequences
    ('\xadƒÄ»', '→'),
    ('\xadƒæñ', '→'),
    ('\xadƒôÄ', '💡'),
    ('\xadƒôè', '💡'),
    # Icon sequences
    ('ÔÅ▒', '✓'),
    ('ÔÇö', '·'),
    ('Ôå®', '↩'),
    ('ÔåÆ', '→'),
    ('Ôåô', '↓'),
    ('Ôåù', '✗'),
    # Already correct — keep as is
    ('──', '──'),
    ('══', '══'),
    ('┬À', '·'),
    ('╝', ''),
    ('▓', ''),
    # Fix partial replacements from previous run
    ('✓à', '→'),
    ('✓ù', '✗'),
]

for old, new in replacements:
    content = content.replace(old, new)

open('app/tracker/page.js', 'w', encoding='utf-8').write(content)
print('Done!')