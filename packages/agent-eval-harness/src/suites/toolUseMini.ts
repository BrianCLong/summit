import suiteFixture from './tool-use-mini.tasks.json';
import { EvalSuite, EvalTask } from '../types';

interface ToolUseMiniFixture {
  suite: EvalSuite & { tasks: EvalTask[] };
}

const typedFixture = suiteFixture as ToolUseMiniFixture;

export function loadToolUseMiniSuite(): EvalSuite {
  return {
    id: typedFixture.suite.id,
    description: typedFixture.suite.description,
    tasks: typedFixture.suite.tasks,
  };
}
