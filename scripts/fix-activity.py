import re

# Read the file
content = open('app/activity/page.tsx', 'r', encoding='utf-8').read()

# Remove all null bytes and non-printable characters except newlines and tabs
content = content.replace('\x00', '')
content = re.sub(r'[^\x09\x0a\x0d\x20-\x7e\x80-\xff]', '', content)

# Remove the // refresh comment we added
lines = content.split('\n')
lines = [l for l in lines if '// refresh' not in l and '// force redeploy' not in l]
content = '\n'.join(lines).rstrip() + '\n'

open('app/activity/page.tsx', 'w', encoding='utf-8', newline='\n').write(content)

# Verify
result = open('app/activity/page.tsx', 'rb').read()
null_count = result.count(b'\x00')
print(f'Null bytes remaining: {null_count}')
print(f'Total lines: {content.count(chr(10))}')
print(f'Contains ActivityLogPage: {"ActivityLogPage" in content}')