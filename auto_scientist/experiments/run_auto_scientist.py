import yaml
from pathlib import Path
from typing import List, Dict, Any

from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

from auto_scientist.graph import ExperimentGraph
from auto_scientist.curriculum import Curriculum, CurriculumStage, StageConstraint
from auto_scientist.planner import Planner, ProposedExperiment
from auto_scientist.runner import ExperimentRunner
from auto_scientist.telemetry import TelemetryLogger
from auto_scientist.schemas import Node, NodeType


# --- Mock Implementations ---

class MockPlanner(Planner):
    """A mock planner that proposes a simple, predefined experiment."""
    def propose_experiments(
        self,
        graph: ExperimentGraph,
        curriculum_stage: str,
        max_proposals: int = 1,
    ) -> List[ProposedExperiment]:
        print(f"[{curriculum_stage}] Planner: Proposing a new experiment...")

        # Propose different C values based on stage
        if curriculum_stage == "baseline":
            c_value = 1.0
        elif curriculum_stage == "ablation":
            c_value = 5.0
        else:
            c_value = 10.0

        return [
            ProposedExperiment(
                description=f"Run a logistic regression model with C={c_value}.",
                config={"model": "logistic_regression", "C": c_value, "solver": "liblinear"},
                depends_on=[],
            )
        ]


def text_classification_train_fn(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    A simple text classification training function using scikit-learn.
    """
    print(f"  Runner: Training with config: {config}")

    # 1. Load data (using a subset of 20 Newsgroups for simplicity)
    categories = ['alt.atheism', 'soc.religion.christian', 'comp.graphics', 'sci.med']
    data = fetch_20newsgroups(subset='train', categories=categories, shuffle=True, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(
        data.data, data.target, test_size=0.2, random_state=42
    )

    # 2. Vectorize text
    vectorizer = TfidfVectorizer(max_features=1000)
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)

    # 3. Train model
    model = LogisticRegression(
        C=config.get("C", 1.0),
        solver=config.get("solver", "liblinear"),
        random_state=42
    )
    model.fit(X_train_tfidf, y_train)

    # 4. Evaluate
    y_pred = model.predict(X_test_tfidf)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"  Runner: Achieved accuracy: {accuracy:.4f}")
    return {"metrics": {"accuracy": accuracy}}

# --- Main Execution Logic ---

def main():
    """Main function to run the auto-scientist loop."""
    # 1. Load Configuration
    config_path = Path(__file__).parent / "configs/text_classification_auto_scientist.yaml"
    with config_path.open("r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # 2. Initialize Components
    graph = ExperimentGraph()
    telemetry = TelemetryLogger(path=Path("outputs/telemetry.jsonl"))

    curriculum_stages = [
        CurriculumStage(
            name=stage['stage'],
            goals=stage['goals'],
            constraints=StageConstraint(**stage['constraints']),
        ) for stage in config['curriculum']
    ]
    curriculum = Curriculum(stages=curriculum_stages)

    planner = MockPlanner()
    runner = ExperimentRunner(train_fn=text_classification_train_fn, telemetry=telemetry)

    # 3. Run the main loop
    max_iterations = 5 # Reduced for faster execution
    print("--- Starting Auto-Scientist Experiment ---")
    for i in range(max_iterations):
        print(f"\n--- Iteration {i+1}/{max_iterations} | Stage: {curriculum.current.name} ---")

        # a. Planner proposes experiments
        proposals = planner.propose_experiments(graph, curriculum.current.name)

        if not proposals:
            print("Planner had no proposals. Stopping.")
            break

        # b. Runner executes the first proposal
        proposal = proposals[0]
        runner.run_experiment(graph, proposal.config, curriculum.current.name)

        # c. Curriculum checks for advancement
        def select_evals_in_stage(g: ExperimentGraph) -> List[Node]:
            return [
                n for n in g.nodes_by_type(NodeType.EVAL)
                if n.stage == curriculum.current.name
            ]

        if curriculum.advance_if_possible(graph, select_evals_in_stage):
            print(f"*** Curriculum advanced to stage: {curriculum.current.name} ***")

        # Check for completion on the final stage
        if curriculum.current_index == len(curriculum.stages) - 1:
            if curriculum.can_advance(graph, select_evals_in_stage):
                print("Final curriculum goal achieved. Stopping.")
                break

    # 4. Final Output
    print("\n--- Experiment Complete ---")
    print(f"Final graph has {len(graph.nodes)} nodes.")

if __name__ == "__main__":
    main()
