edits = {
 'package.json': [('"version": "3.0.0"','"version": "5.0.0"'),('"output": "release-3.0"','"output": "release-5.0"'),('SATURN.AI 3.0 Setup','SATURN.AI 5.0 Setup'),('SATURN.AI 3.0 Portable','SATURN.AI 5.0 Portable')],
 'electron/preload.cjs': [("'3.0.0'","'5.0.0'")],
 'index.html': [('Dashboard 3.0','Dashboard 5.0')],
 'src/components/Sidebar.jsx': [('v3.0','v5.0')],
 'docs/index.html': [('Dashboard 3.0','Dashboard 5.0'),('Versão 3.0','Versão 5.0'),('mudou na 3.0','mudou na 5.0'),('v3.0','v5.0')],
}
for p, reps in edits.items():
    s = open(p, encoding='utf-8').read()
    for a, b in reps:
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
print('ok')
