class PipelineRunner:
    def __init__(self, config):
        self.config = config

    def execute(self):
        print("Executing pipeline with config:", self.config)
        return True
