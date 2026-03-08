class Ledger:
    def __init__(self):
        self.todos = []
        self.decisions = []
        self.evidence = []

    def add_todo(self, todo: str):
        self.todos.append(todo)

    def add_decision(self, decision: str):
        self.decisions.append(decision)

    def add_evidence(self, evidence: str):
        self.evidence.append(evidence)
