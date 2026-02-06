import json
from .cost import BudgetLedger

class Budget:
    def __init__(self, limit):
        self.limit = limit

class Ledger:
    def __init__(self, budget_limit):
        self.ledger = BudgetLedger(budget_limit)

    def save(self, filepath):
        with open(filepath, 'w') as f:
            json.dump(self.ledger.to_dict(), f, indent=2, sort_keys=True)

def save_ledger(ledger, filepath):
    if hasattr(ledger, 'save'):
        ledger.save(filepath)
    else:
        with open(filepath, 'w') as f:
            json.dump(ledger.to_dict(), f, indent=2, sort_keys=True)
