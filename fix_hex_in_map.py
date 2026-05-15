import re

with open('relief-relay-ui/src/components/CrisisOperationsMap.tsx', 'r') as f:
    content = f.read()

replacements = {
    r'#ef4444': 'var(--triage-red)',
    r'#f97316': 'var(--triage-orange)',
    r'#f59e0b': 'var(--triage-yellow)',
    r'#10b981': 'var(--triage-green)',
    r'#3b82f6': 'var(--accent)',
    r'#ec4899': 'var(--accent-light)',
    r'#8b5cf6': 'var(--text-secondary)',
    r'bg-\[linear-gradient\(180deg,#0b1a2a,#091422\)\]': 'bg-bg-primary',
    r'bg-\[#0b111b\]': 'bg-bg-primary',
    r'#6b7280': 'var(--text-muted)',
    r'#ffffff': 'var(--text-primary)',
    r'#e5e7eb': 'var(--text-primary)',
    r'#d1d5db': 'var(--text-primary)',
    r'#9ca3af': 'var(--text-secondary)'
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

with open('relief-relay-ui/src/components/CrisisOperationsMap.tsx', 'w') as f:
    f.write(content)
