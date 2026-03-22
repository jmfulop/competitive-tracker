lines = open('app/tracker/page.js', 'r', encoding='utf-8').readlines()

# Fix line 351 (index 350) specifically - the help modal signal examples
for i, line in enumerate(lines):
    if 'text-purple-500 mt-0.5">->' in line:
        lines[i] = line.replace('>-></span>', '>\u2192</span>')
        print(f'Fixed line {i+1}')

open('app/tracker/page.js', 'w', encoding='utf-8').writelines(lines)
print('Done!')