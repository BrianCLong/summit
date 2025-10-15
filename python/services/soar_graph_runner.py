"""
SOAR Graph-Aware Playbook Runner - v1.3
DAG-based execution with entity resolution integration
"""

import asyncio
import networkx as nx
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class EntityType(Enum):
    IP = "ip"
    DOMAIN = "domain"
    HASH = "hash"
    USER = "user"
    HOST = "host"


@dataclass
class PlaybookTask:
    """Single task in playbook DAG"""
    task_id: str
    name: str
    action: str  # isolate, block, enrich, notify, etc.
    params: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)
    requires_approval: bool = False
    timeout_seconds: int = 300
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class EntityContext:
    """Entity context for graph-aware execution"""
    entity_id: str
    entity_type: EntityType
    entity_value: str
    graph_relationships: List[Dict] = field(default_factory=list)
    related_entities: Set[str] = field(default_factory=set)
    risk_score: float = 0.0
    metadata: Dict = field(default_factory=dict)


@dataclass
class TaskExecution:
    """Task execution result"""
    task_id: str
    status: TaskStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    result: Optional[Dict] = None
    error: Optional[str] = None
    entity_updates: List[str] = field(default_factory=list)


class GraphAwarePlaybookRunner:
    """
    Graph-aware SOAR playbook runner with DAG execution

    Features:
    - DAG-based task orchestration
    - Entity resolution integration
    - Parallel execution of independent tasks
    - Batch approval workflow
    - Entity graph traversal
    """

    def __init__(self, neo4j_uri: str, neo4j_user: str, neo4j_password: str):
        self.neo4j_uri = neo4j_uri
        self.neo4j_user = neo4j_user
        self.neo4j_password = neo4j_password
        self.execution_graph: Optional[nx.DiGraph] = None
        self.entity_cache: Dict[str, EntityContext] = {}
        self.task_results: Dict[str, TaskExecution] = {}

    async def execute_playbook(self, playbook: Dict,
                              trigger_entity: EntityContext,
                              batch_approval: bool = False) -> Dict:
        """
        Execute playbook with graph-aware entity resolution

        Args:
            playbook: Playbook definition with tasks
            trigger_entity: Entity that triggered the playbook
            batch_approval: Whether to use batch approval for all tasks

        Returns:
            Execution summary
        """
        logger.info(f"Starting playbook execution: {playbook['name']}")

        # Build execution DAG
        self.execution_graph = self._build_dag(playbook['tasks'])

        # Resolve entity relationships from graph
        await self._resolve_entity_context(trigger_entity)

        # Get execution plan (topological order)
        execution_plan = self._get_execution_plan()

        # Handle batch approval if needed
        if batch_approval:
            approval_granted = await self._request_batch_approval(execution_plan)
            if not approval_granted:
                return self._create_summary(TaskStatus.SKIPPED, "Approval denied")

        # Execute tasks in DAG order with parallelization
        dag_success = await self._execute_dag(execution_plan)

        # Generate execution summary
        if dag_success:
            summary_status = TaskStatus.SUCCESS
            summary_message = "Playbook completed"
        else:
            summary_status = TaskStatus.FAILED
            summary_message = "Playbook completed with errors"

        summary = self._create_summary(summary_status, summary_message)

        logger.info(f"Playbook execution complete: {playbook['name']}")
        return summary

    def _build_dag(self, tasks: List[Dict]) -> nx.DiGraph:
        """Build DAG from task dependencies"""
        G = nx.DiGraph()

        # Add all tasks as nodes
        for task_def in tasks:
            task = PlaybookTask(**task_def)
            G.add_node(task.task_id, task=task)

        # Add edges for dependencies
        for task_def in tasks:
            task_id = task_def['task_id']
            for dep_id in task_def.get('dependencies', []):
                G.add_edge(dep_id, task_id)

        # Validate DAG (no cycles)
        if not nx.is_directed_acyclic_graph(G):
            raise ValueError("Playbook tasks contain circular dependencies")

        return G

    async def _resolve_entity_context(self, entity: EntityContext):
        """Resolve entity relationships from graph database"""
        # Mock - replace with actual Neo4j query
        query = f"""
        MATCH (e:{entity.entity_type.value} {{id: $entity_id}})
        OPTIONAL MATCH (e)-[r]-(related)
        RETURN e, r, related
        LIMIT 100
        """

        # Simulate graph query results
        entity.graph_relationships = [
            {'type': 'CONNECTS_TO', 'target': 'server-123', 'target_type': 'host'},
            {'type': 'OWNED_BY', 'target': 'user-456', 'target_type': 'user'}
        ]

        entity.related_entities = {
            'server-123',
            'user-456'
        }

        self.entity_cache[entity.entity_id] = entity

        logger.debug(f"Resolved {len(entity.related_entities)} related entities for {entity.entity_id}")

    def _get_execution_plan(self) -> List[List[str]]:
        """Get execution plan with parallel task groups"""
        # Topological sort for dependency order
        topo_order = list(nx.topological_sort(self.execution_graph))

        # Group tasks by level (can run in parallel)
        levels = []
        for node in topo_order:
            # Find level for this task
            task_level = 0
            for dep in self.execution_graph.predecessors(node):
                dep_level = next((i for i, level in enumerate(levels) if dep in level), -1)
                task_level = max(task_level, dep_level + 1)

            # Add to appropriate level
            while len(levels) <= task_level:
                levels.append([])
            levels[task_level].append(node)

        return levels

    async def _request_batch_approval(self, execution_plan: List[List[str]]) -> bool:
        """Request batch approval for all tasks requiring approval"""
        approval_tasks = []

        for level in execution_plan:
            for task_id in level:
                task = self.execution_graph.nodes[task_id]['task']
                if task.requires_approval:
                    approval_tasks.append(task)

        if not approval_tasks:
            return True  # No approval needed

        # Mock approval request - replace with actual approval API
        approval_request = {
            'request_id': f"approval_{datetime.utcnow().timestamp()}",
            'tasks': [{'task_id': t.task_id, 'name': t.name, 'action': t.action} for t in approval_tasks],
            'count': len(approval_tasks),
            'requested_at': datetime.utcnow().isoformat()
        }

        logger.info(f"Batch approval request: {approval_request['request_id']} ({len(approval_tasks)} tasks)")

        # Simulate approval (auto-approve in this example)
        return True

    async def _execute_dag(self, execution_plan: List[List[str]]) -> bool:
        """Execute DAG with parallelization

        Returns:
            bool: True if all tasks completed successfully, False if any failed.
        """
        overall_success = True

        for level_idx, level_tasks in enumerate(execution_plan):
            logger.info(f"Executing level {level_idx}: {len(level_tasks)} tasks")

            # Execute tasks in this level in parallel
            tasks = []
            for task_id in level_tasks:
                task = self.execution_graph.nodes[task_id]['task']
                tasks.append(self._execute_task(task))

            # Wait for all tasks in this level to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Check for failures
            for task_id, result in zip(level_tasks, results):
                if isinstance(result, Exception):
                    logger.error(f"Task {task_id} failed: {result}")
                    overall_success = False

                    # `_execute_task` records failure results before raising,
                    # but guard in case an unexpected exception bypassed it.
                    if task_id not in self.task_results:
                        self.task_results[task_id] = TaskExecution(
                            task_id=task_id,
                            status=TaskStatus.FAILED,
                            start_time=datetime.utcnow(),
                            end_time=datetime.utcnow(),
                            error=str(result)
                        )

        return overall_success

    async def _execute_task(self, task: PlaybookTask) -> TaskExecution:
        """Execute single task"""
        start_time = datetime.utcnow()

        logger.info(f"Executing task: {task.task_id} ({task.action})")

        try:
            # Execute task action
            result = await self._perform_action(task)

            # Get entity updates from result
            entity_updates = result.get('entity_updates', [])

            execution = TaskExecution(
                task_id=task.task_id,
                status=TaskStatus.SUCCESS,
                start_time=start_time,
                end_time=datetime.utcnow(),
                result=result,
                entity_updates=entity_updates
            )

            self.task_results[task.task_id] = execution

            logger.info(f"Task {task.task_id} completed successfully")
            return execution

        except Exception as e:
            logger.error(f"Task {task.task_id} failed: {e}")

            # Retry if configured
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                logger.info(f"Retrying task {task.task_id} (attempt {task.retry_count}/{task.max_retries})")
                await asyncio.sleep(2 ** task.retry_count)  # Exponential backoff
                return await self._execute_task(task)

            execution = TaskExecution(
                task_id=task.task_id,
                status=TaskStatus.FAILED,
                start_time=start_time,
                end_time=datetime.utcnow(),
                error=str(e)
            )

            self.task_results[task.task_id] = execution
            raise

    async def _perform_action(self, task: PlaybookTask) -> Dict:
        """Perform task action with graph context"""
        action = task.action
        params = task.params

        # Get entity context
        entity_id = params.get('entity_id')
        entity_context = self.entity_cache.get(entity_id)

        # Simulate action execution with graph awareness
        result = {
            'action': action,
            'status': 'success',
            'entity_id': entity_id,
            'entity_updates': []
        }

        # Action-specific logic with graph context
        if action == 'isolate':
            # Isolate entity and related entities
            result['isolated_entities'] = [entity_id] + list(entity_context.related_entities if entity_context else [])
            result['entity_updates'] = [{'entity': e, 'action': 'isolated'} for e in result['isolated_entities']]

        elif action == 'block':
            # Block entity in firewall
            result['blocked'] = True
            result['entity_updates'] = [{'entity': entity_id, 'action': 'blocked'}]

        elif action == 'enrich':
            # Enrich with threat intel
            result['enrichment'] = {
                'risk_score': 0.8,
                'threat_tags': ['malware', 'c2'],
                'related_campaigns': ['APT-123']
            }

        elif action == 'notify':
            # Send notification
            result['notified'] = params.get('recipients', [])

        # Simulate delay
        await asyncio.sleep(0.1)

        return result

    def _create_summary(self, status: TaskStatus, message: str) -> Dict:
        """Create execution summary"""
        successful = sum(1 for r in self.task_results.values() if r.status == TaskStatus.SUCCESS)
        failed = sum(1 for r in self.task_results.values() if r.status == TaskStatus.FAILED)

        return {
            'status': status.value,
            'message': message,
            'total_tasks': len(self.task_results),
            'successful_tasks': successful,
            'failed_tasks': failed,
            'task_results': {
                task_id: {
                    'status': result.status.value,
                    'result': result.result,
                    'error': result.error,
                    'entity_updates': result.entity_updates
                }
                for task_id, result in self.task_results.items()
            },
            'completed_at': datetime.utcnow().isoformat()
        }


async def example_usage():
    """Example playbook execution"""

    # Create runner
    runner = GraphAwarePlaybookRunner(
        neo4j_uri="bolt://localhost:7687",
        neo4j_user="neo4j",
        neo4j_password="password"
    )

    # Define playbook
    playbook = {
        'name': 'Malware Response Playbook',
        'tasks': [
            {
                'task_id': 'task_1',
                'name': 'Enrich Indicator',
                'action': 'enrich',
                'params': {'entity_id': 'ip-1.2.3.4'},
                'dependencies': [],
                'requires_approval': False
            },
            {
                'task_id': 'task_2',
                'name': 'Isolate Host',
                'action': 'isolate',
                'params': {'entity_id': 'host-123'},
                'dependencies': ['task_1'],
                'requires_approval': True
            },
            {
                'task_id': 'task_3',
                'name': 'Block IP',
                'action': 'block',
                'params': {'entity_id': 'ip-1.2.3.4'},
                'dependencies': ['task_1'],
                'requires_approval': True
            },
            {
                'task_id': 'task_4',
                'name': 'Notify SOC',
                'action': 'notify',
                'params': {'entity_id': 'ip-1.2.3.4', 'recipients': ['soc@example.com']},
                'dependencies': ['task_2', 'task_3'],
                'requires_approval': False
            }
        ]
    }

    # Trigger entity
    trigger_entity = EntityContext(
        entity_id='ip-1.2.3.4',
        entity_type=EntityType.IP,
        entity_value='1.2.3.4',
        risk_score=0.9
    )

    # Execute with batch approval
    result = await runner.execute_playbook(playbook, trigger_entity, batch_approval=True)

    print("Playbook Execution Result:")
    print(f"  Status: {result['status']}")
    print(f"  Total Tasks: {result['total_tasks']}")
    print(f"  Successful: {result['successful_tasks']}")
    print(f"  Failed: {result['failed_tasks']}")


if __name__ == "__main__":
    asyncio.run(example_usage())
