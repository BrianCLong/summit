from summit.agents.ai_founder_agent.clarity_test import score_clarity
from summit.agents.ai_founder_agent.ingestion import parse_idea
from summit.agents.ai_founder_agent.interview_planner import generate_interviews
from summit.agents.ai_founder_agent.momentum_scoring import compute_momentum_score
from summit.agents.ai_founder_agent.problem_definition import define_problem
from summit.agents.ai_founder_agent.report_generator import create_report


def run_founder_agent(idea_file: str):
    idea_text = parse_idea(idea_file)
    problem = define_problem(idea_text)
    clarity = score_clarity(problem)
    interviews = generate_interviews(problem)
    momentum = compute_momentum_score(problem, interviews, [], {})
    create_report(idea_text, problem, interviews, momentum)

if __name__ == "__main__":
    run_founder_agent("inputs/idea.md")
