with open('.github/workflows/pr-quality-gate.yml') as f:
    content = f.read()

# Fix pnpm lint:release-policy -> pnpm test:release-scripts
content = content.replace('pnpm lint:release-policy', 'pnpm test:release-scripts')

# Fix LongRunJob missing pnpm action-setup
target = '''    steps:
      - name: Checkout
        uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

      - name: Setup Node.js'''
replacement = '''    steps:
      - name: Checkout
        uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Setup Node.js'''
content = content.replace(target, replacement)

# Fix pnpm action-setup missing run_install false
target_pnpm = '''      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js'''
replacement_pnpm = '''      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Setup Node.js'''
content = content.replace(target_pnpm, replacement_pnpm)

with open('.github/workflows/pr-quality-gate.yml', 'w') as f:
    f.write(content)
