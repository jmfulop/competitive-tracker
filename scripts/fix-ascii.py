content = open('app/tracker/page.js', 'r', encoding='utf-8').read()

# Fix -> in JSX spans (invalid JSX syntax)
content = content.replace('>-></span>', '>{"->"}</span>')

# Fix standalone -> at end of text
content = content.replace('intelligence ->', 'intelligence &rarr;')

# Fix remaining arrow issues  
content = content.replace("'->'", '"→"')

open('app/tracker/page.js', 'w', encoding='utf-8').write(content)
print('Done!')