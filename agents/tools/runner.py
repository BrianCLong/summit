class Runner:
    def __init__(self, budget):
        self.budget = budget
        self.steps_taken = 0

    def run_tool(self, tool, *args, **kwargs):
        if self.steps_taken >= self.budget.max_steps:
            raise Exception("Step budget exceeded")
        self.steps_taken += 1
        return tool(*args, **kwargs)
