import argparse

from auto_scientist.impl.src.engine import ExecutionEngine
from auto_scientist.impl.src.generator import Generator
from auto_scientist.impl.src.logger import Logger
from auto_scientist.impl.src.oversight import Oversight


def main():
    parser = argparse.ArgumentParser(description="Auto-Scientist Loop")
    parser.add_argument("--topic", type=str, default="Materials Science", help="Research topic")
    parser.add_argument("--iterations", type=int, default=3, help="Max iterations")
    parser.add_argument("--jsonl", type=str, default="experiment.jsonl", help="Log output")
    args = parser.parse_args()

    logger = Logger(args.jsonl)
    logger.log("start", {"topic": args.topic})

    gen = Generator()
    over = Oversight()
    engine = ExecutionEngine()

    hypothesis = gen.generate(args.topic)
    logger.log("generated", {"hypothesis": hypothesis})

    for i in range(args.iterations):
        score, critique = over.evaluate(hypothesis, "safety_v1")
        logger.log("oversight", {"iteration": i, "score": score, "critique": critique})

        if score > 0.8:
            logger.log("approved", {"hypothesis": hypothesis})
            result = engine.run(hypothesis)
            logger.log("execution", {"result": result})
            return
        else:
            hypothesis = gen.refine(hypothesis, critique)
            logger.log("refined", {"hypothesis": hypothesis})

    logger.log("failed", {"reason": "max_iterations_exceeded"})


if __name__ == "__main__":
    main()
