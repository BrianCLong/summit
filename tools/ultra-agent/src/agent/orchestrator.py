from __future__ import annotations
from .agents.architect import ArchitectAgent
from .agents.engineer import EngineerAgent
from .agents.tester import TesterAgent
from .agents.documenter import DocumenterAgent
from .agents.devops import DevOpsAgent
from .agents.reviewer import ReviewerAgent
from .tools import write_file, run_tests
import json

class Orchestrator:
    def __init__(self, llm):
        self.architect = ArchitectAgent(llm)
        self.engineer = EngineerAgent(llm)
        self.tester = TesterAgent(llm)
        self.documenter = DocumenterAgent(llm)
        self.devops = DevOpsAgent(llm)
        self.reviewer = ReviewerAgent(llm)

    async def build_system(self, request, sys_prompt):
        # 1. Architecture
        print("[Orchestrator] Architecting...")
        arch_raw = await self.architect.design_system(request, sys_prompt)
        arch = self._safe_parse(arch_raw)

        # 2. Implementation
        print("[Orchestrator] Implementing...")
        impl_raw = await self.engineer.implement(arch, sys_prompt)
        impl = self._safe_parse(impl_raw)

        # 3. Tests
        print("[Orchestrator] Generating Tests...")
        tests_raw = await self.tester.generate_tests(arch, impl.get("files", {}), sys_prompt)
        tests = self._safe_parse(tests_raw)

        # 4. Verification loop
        print("[Orchestrator] Verifying...")
        for i in range(3): # Reduced to 3 for demo
            self._write_files(impl.get("files", {}))
            self._write_files(tests.get("tests", {}))

            # This runs tests in the current environment - careful!
            # In a real agent, use Sandbox.
            passed = run_tests()

            if passed:
                print(f"[Orchestrator] Tests passed on attempt {i+1}.")
                break

            print(f"[Orchestrator] Tests failed on attempt {i+1}. Iterating...")
            feedback = "Tests failed. Fix the code and tests." # Real agent would capture stderr

            impl_raw = await self.engineer.improve(arch, impl, feedback, sys_prompt)
            impl = self._safe_parse(impl_raw)

            tests_raw = await self.tester.improve(arch, tests, feedback, sys_prompt)
            tests = self._safe_parse(tests_raw)

        # 5. Documentation
        print("[Orchestrator] Documenting...")
        docs_raw = await self.documenter.document(arch, impl, sys_prompt)
        docs = self._safe_parse(docs_raw)
        self._write_files(docs.get("files", {}))

        # 6. DevOps setup
        print("[Orchestrator] Configuring DevOps...")
        infra_raw = await self.devops.build(arch, impl, sys_prompt)
        infra = self._safe_parse(infra_raw)
        self._write_files(infra.get("files", {}))

        # 7. Final review
        print("[Orchestrator] Final Review...")
        review = await self.reviewer.evaluate(arch, impl, tests, docs, sys_prompt)

        return {
            "architecture": arch,
            "files": impl.get("files", {}),
            "tests": tests.get("tests", {}),
            "docs": docs.get("files", {}),
            "infra": infra.get("files", {}),
            "review": review
        }

    def _safe_parse(self, text):
        if isinstance(text, dict): return text
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            return json.loads(text[start:end])
        except:
            return {}

    def _write_files(self, file_map):
        for path, content in file_map.items():
            if not path.startswith("output/"):
                full_path = f"output/{path}"
            else:
                full_path = path
            write_file(full_path, content)
