import json
from .cost import BudgetLedger

# Exporting BudgetLedger
__all__ = ['BudgetLedger', 'save_ledger']

def save_ledger(ledger, filepath):
    with open(filepath, 'w') as f:
        json.dump(ledger.to_dict(), f, indent=2, sort_keys=True)
