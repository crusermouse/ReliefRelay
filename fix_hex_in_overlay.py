import re

with open('relief-relay-ui/src/components/OfflineModeOverlay.tsx', 'r') as f:
    content = f.read()

content = content.replace('bg-[#05080ecc]', 'bg-bg-primary/80')

with open('relief-relay-ui/src/components/OfflineModeOverlay.tsx', 'w') as f:
    f.write(content)
