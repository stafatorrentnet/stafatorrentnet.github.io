import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the main <script> block
script_start = content.find('<script>\n// ─── Guides')
if script_start == -1:
    print("Script start not found")
    exit(1)
    
script_end = content.find('</script>', script_start)

html_part1 = content[:script_start]
js_part = content[script_start+9:script_end]
html_part2 = content[script_end+9:]

# Insert module script
new_html = html_part1 + '<script type="module" src="/src/main.js"></script>\n' + html_part2

# Add css link
new_html = new_html.replace('</head>', '    <link rel="stylesheet" href="/src/style.css">\n</head>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js_part)

print("Split complete")
