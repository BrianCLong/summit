import os
from pathlib import Path

import openai
import yaml


def load_roles(path: Path):
    with path.open() as f:
        data = yaml.safe_load(f)
    return {r["name"]: r for r in data.get("roles", [])}


class TeamAgent:
    """Simple wrapper around an LLM for a specific role."""

    def __init__(self, name: str, prompt: str):
        self.name = name
        self.prompt = prompt

    def perform(self, user_prompt: str) -> str:
        system_prompt = f"You are {self.name}. {self.prompt}"
        response = openai.ChatCompletion.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content.strip()


def automate_coding_task(task_description: str, roles: dict):
    """Run a coding task through planner, coder, reviewer, and tester agents."""
    planner = TeamAgent("Planner", roles["Planner"]["prompt"])
    coder = TeamAgent("Coder", roles["Coder"]["prompt"])
    reviewer = TeamAgent("Reviewer", roles["Reviewer"]["prompt"])
    tester = TeamAgent("Tester", roles["Tester"]["prompt"])

    plan = planner.perform(
        f"Break down the following coding task into detailed steps: {task_description}.\nOutput as a numbered list of steps."
    )
    code = coder.perform(
        f"Based on this plan, write the complete Python code for the task: {task_description}.\nPlan: {plan}.\nOutput only the code in a code block."
    )

    review = reviewer.perform(
        f"Review this code for the task '{task_description}': {code}.\nSuggest improvements or fixes. If good, say 'Approved'."
    )
    if "Approved" not in review:
        code = coder.perform(
            f"Revise the code based on this review: {review}.\nOriginal plan: {plan}.\nOutput only the revised code."
        )

    tests = tester.perform(
        f"Write unit tests (using pytest syntax) for this code: {code}.\nCover key functionalities for the task '{task_description}'."
    )
    return code, tests


if __name__ == "__main__":
    openai.api_key = os.getenv("OPENAI_API_KEY")
    roles_path = Path(__file__).resolve().parent.parent / "project_management" / "team-roles.yaml"
    roles = load_roles(roles_path)
    task = "Write a Python function to calculate the factorial of a number, handling edge cases."
    final_code, final_tests = automate_coding_task(task, roles)
    print("\nFinal Output:")
    print("Code:\n", final_code)
    print("Tests:\n", final_tests)
