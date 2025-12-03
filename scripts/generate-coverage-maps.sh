#!/bin/bash
set -e

# Directory for consolidated reports
REPORT_DIR="coverage-reports"
mkdir -p "$REPORT_DIR"

echo "=================================================="
echo "Generating Test Coverage Heat Maps per Service"
echo "=================================================="

# 1. Server (Node.js/Jest)
echo ""
echo "[Server] Running coverage..."
if [ -d "server" ]; then
  cd server
  # Run coverage. We use || true to proceed even if tests fail (we want the report)
  npm run test:coverage || true
  cd ..

  if [ -f "server/coverage/coverage-summary.json" ]; then
    cp server/coverage/coverage-summary.json "$REPORT_DIR/server-coverage-summary.json"
    echo "[Server] JSON summary generated."
  else
    echo "[Server] Failed to generate JSON summary."
  fi
else
  echo "[Server] Directory not found."
fi

# 2. Web (React/Vitest)
echo ""
echo "[Web] Running coverage..."
if [ -d "apps/web" ]; then
  cd apps/web
  echo "Attempting vitest coverage..."
  # Ensure we use the config that has json-summary
  # We try-catch the execution because tests might fail
  npx vitest run --coverage --config vitest.config.ts || true
  cd ../..

  if [ -f "apps/web/coverage/coverage-summary.json" ]; then
    cp apps/web/coverage/coverage-summary.json "$REPORT_DIR/web-coverage-summary.json"
    echo "[Web] JSON summary generated."
  else
    echo "[Web] Failed to generate JSON summary. (Check if tests ran successfully)"
  fi
else
  echo "[Web] Directory not found."
fi

# 3. Prov-Ledger (Python/Pytest)
echo ""
echo "[Prov-Ledger] Running coverage..."
if [ -d "prov-ledger" ]; then
  cd prov-ledger
  if command -v pip &> /dev/null; then
      echo "Ensuring dependencies are installed..."
      pip install pytest-cov || true
      # Skip pip install . for now as it causes build error due to flat layout
      pip install fastapi uvicorn pydantic networkx prometheus-client cryptography prov httpx || true
  fi

  if command -v pytest &> /dev/null; then
    # Fix import errors by adding current directory to PYTHONPATH
    export PYTHONPATH=$PYTHONPATH:.

    # Use pytest directly with coverage arguments
    # Note: --cov=. to cover current dir (including src if present or root modules)
    # Output to json file directly
    pytest --cov=. --cov-report=json:coverage-summary.json tests || true

    if [ -f "coverage-summary.json" ]; then
      cp coverage-summary.json "../$REPORT_DIR/prov-ledger-coverage-summary.json"
      echo "[Prov-Ledger] JSON summary generated."
    else
      echo "[Prov-Ledger] JSON summary not found."
    fi
  else
    echo "[Prov-Ledger] pytest not found. Skipping."
  fi
  cd ..
else
  echo "[Prov-Ledger] Directory not found."
fi

# 4. Rust (Cargo)
# Placeholder as usual

# Python script to generate HTML Heat Map
echo ""
echo "Generating Visual Heat Map..."

cat > scripts/generate_heat_map.py <<EOF
import json
import os
from datetime import datetime

services = [
    {'name': 'Server', 'file': 'coverage-reports/server-coverage-summary.json', 'type': 'jest'},
    {'name': 'Web', 'file': 'coverage-reports/web-coverage-summary.json', 'type': 'vitest'},
    {'name': 'Prov-Ledger', 'file': 'coverage-reports/prov-ledger-coverage-summary.json', 'type': 'python'},
    {'name': 'Rust', 'file': None, 'type': 'placeholder'}
]

# Split HTML to avoid formatting issues with CSS percentages
html_head = '''
<!DOCTYPE html>
<html>
<head>
  <title>IntelGraph Test Coverage Heat Maps</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 2rem; background: #f4f6f8; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { text-align: center; color: #333; }
    .timestamp { text-align: center; color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .card { border: 1px solid #eee; padding: 1.5rem; margin-bottom: 1rem; border-radius: 6px; background: #fff; }
    .card h2 { margin-top: 0; display: flex; justify-content: space-between; align-items: center; }
    .metrics { display: flex; gap: 2rem; margin-top: 1rem; }
    .metric { flex: 1; text-align: center; }
    .metric-value { font-size: 1.5rem; font-weight: bold; }
    .metric-label { font-size: 0.8rem; text-transform: uppercase; color: #777; margin-top: 0.25rem; }
    .bar-container { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
    .bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .good { color: #28a745; } .bg-good { background: #28a745; }
    .warn { color: #ffc107; } .bg-warn { background: #ffc107; }
    .bad { color: #dc3545; } .bg-bad { background: #dc3545; }
    .placeholder { color: #888; font-style: italic; }
  </style>
</head>
<body>
  <div class='container'>
    <h1>Test Coverage Heat Maps</h1>
    <p class='timestamp'>Generated on ''' + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + '''</p>
'''

html_content = html_head

def get_color_class(pct):
    if pct >= 80: return 'good', 'bg-good'
    if pct >= 50: return 'warn', 'bg-warn'
    return 'bad', 'bg-bad'

for service in services:
    name = service['name']

    if service['type'] == 'placeholder':
        html_content += f'''
        <div class='card'>
            <h2>{name} <span style='font-size:0.8rem; font-weight:normal; color:#888'>N/A</span></h2>
            <p class='placeholder'>Coverage data not available (Tooling missing in environment)</p>
        </div>
        '''
        continue

    if not service['file'] or not os.path.exists(service['file']):
        html_content += f'''
        <div class='card'>
            <h2>{name} <span style='font-size:0.8rem; font-weight:normal; color:#dc3545'>Failed</span></h2>
            <p class='placeholder'>Report file not found: {service['file']}</p>
        </div>
        '''
        continue

    try:
        with open(service['file']) as f:
            data = json.load(f)

        lines_pct = 0
        stmts_pct = 0
        funcs_pct = 0
        branches_pct = 0

        if service['type'] == 'python':
            # coverage.json format
            totals = data.get('totals', {})
            lines_pct = totals.get('percent_covered', 0)
            stmts_pct = lines_pct # Approx

        else:
            # Jest/Vitest json-summary format
            total = data.get('total', {})
            lines_pct = total.get('lines', {}).get('pct', 0)
            stmts_pct = total.get('statements', {}).get('pct', 0)
            funcs_pct = total.get('functions', {}).get('pct', 0)
            branches_pct = total.get('branches', {}).get('pct', 0)

        l_cls, l_bg = get_color_class(lines_pct)
        s_cls, s_bg = get_color_class(stmts_pct)
        f_cls, f_bg = get_color_class(funcs_pct)
        b_cls, b_bg = get_color_class(branches_pct)

        html_content += f'''
        <div class='card'>
            <h2>{name} <span class='{l_cls}'>{lines_pct:.1f}%</span></h2>
            <div class='metrics'>
                <div class='metric'>
                    <div class='metric-value {l_cls}'>{lines_pct:.1f}%</div>
                    <div class='bar-container'><div class='bar {l_bg}' style='width: {lines_pct}%'></div></div>
                    <div class='metric-label'>Lines</div>
                </div>
        '''

        if service['type'] != 'python':
             html_content += f'''
                <div class='metric'>
                    <div class='metric-value {s_cls}'>{stmts_pct:.1f}%</div>
                    <div class='bar-container'><div class='bar {s_bg}' style='width: {stmts_pct}%'></div></div>
                    <div class='metric-label'>Statements</div>
                </div>
                <div class='metric'>
                    <div class='metric-value {f_cls}'>{funcs_pct:.1f}%</div>
                    <div class='bar-container'><div class='bar {f_bg}' style='width: {funcs_pct}%'></div></div>
                    <div class='metric-label'>Functions</div>
                </div>
                <div class='metric'>
                    <div class='metric-value {b_cls}'>{branches_pct:.1f}%</div>
                    <div class='bar-container'><div class='bar {b_bg}' style='width: {branches_pct}%'></div></div>
                    <div class='metric-label'>Branches</div>
                </div>
            '''

        html_content += '''
            </div>
        </div>
        '''

    except Exception as e:
        html_content += f'''
        <div class='card'>
            <h2>{name} <span style='font-size:0.8rem; font-weight:normal; color:#dc3545'>Error</span></h2>
            <p class='placeholder'>Error parsing report: {str(e)}</p>
        </div>
        '''

html_content += '''
  </div>
</body>
</html>
'''

with open('coverage-reports/heat-map.html', 'w') as f:
    f.write(html_content)
EOF

python3 scripts/generate_heat_map.py
rm scripts/generate_heat_map.py

echo "=================================================="
echo "Done. Open coverage-reports/heat-map.html"
echo "=================================================="
