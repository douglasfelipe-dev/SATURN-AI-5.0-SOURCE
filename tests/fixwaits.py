p = 'tests/t3_notes.mjs'
s = open(p, encoding='utf-8').read()
s = s.replace('await c.wait(600)', 'await c.wait(1000)')
s = s.replace('await c.wait(400)', 'await c.wait(900)')
s = s.replace('await c.wait(700)', 'await c.wait(1100)')
open(p, 'w', encoding='utf-8').write(s)
print('ok')
