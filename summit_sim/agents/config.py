import os


class SimConfig:
    @staticmethod
    def use_llm_agents() -> bool:
        return os.environ.get("SIM_LLM_AGENTS", "0") == "1"

    @staticmethod
    def use_rag_memory() -> bool:
        return os.environ.get("SIM_RAG_MEMORY", "0") == "1"

    @staticmethod
    def use_interventions() -> bool:
        return os.environ.get("SIM_INTERVENTIONS", "0") == "1"
