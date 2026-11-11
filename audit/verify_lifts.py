#!/usr/bin/env python3
"""Kehai's audit: diff every `// from file:A-B` block in convergence.html against the real source line range.
Run from a directory with convergence.html, sonder/, vanta/, spiralos/ side by side."""
import re, difflib, sys
H = open('convergence.html').read().split('\n')
for i, l in enumerate(H):
    m = re.match(r'^// from (\S+?):(\d+)-(\d+)$', l)
    if not m: continue
    f, a, b = m.group(1), int(m.group(2)), int(m.group(3))
    end = H.index(f'// end from {f}:{a}-{b}', i + 1)
    src = open(f).read().split('\n')[a - 1:b]; lifted = H[i + 1:end]
    if src == lifted: print(f'IDENTICAL {f}:{a}-{b}'); continue
    d = [x for x in difflib.unified_diff(src, lifted, lineterm='', n=0) if x[:1] in '+-' and x[:3] not in ('+++', '---')]
    print(f'DIFFERS   {f}:{a}-{b}  ({len(d)} changed lines)'); print('   ' + '\n   '.join(d))
