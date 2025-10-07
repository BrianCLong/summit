"""
SOAR v1.4 Bulk Operations - Scale & Safety
Idempotent operations, retries/backoff, rate limits, circuit breakers
"""

import asyncio
import time
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
from collections import deque
import hashlib

logger = logging.getLogger(__name__)


class OperationStatus(Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"


class CircuitBreakerState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Circuit broken, failing fast
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class BulkOperation:
    """Bulk SOAR operation"""
    operation_id: str
    playbook_id: str
    incidents: List[str]  # List of incident IDs
    action: str  # isolate, block, enrich, notify, etc.
    params: Dict
    priority: int = 1
    idempotency_key: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class OperationResult:
    """Operation execution result"""
    operation_id: str
    incident_id: str
    status: OperationStatus
    attempts: int = 0
    result: Optional[Dict] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class CircuitBreaker:
    """Circuit breaker for step failure isolation"""
    step_id: str
    state: CircuitBreakerState = CircuitBreakerState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[datetime] = None
    failure_threshold: int = 5
    success_threshold: int = 3
    timeout_seconds: int = 60


class BulkOperationQueue:
    """
    Queue-based bulk operation processor with rate limiting

    Features:
    - Priority queue for operation ordering
    - Rate limiting (ops per second)
    - Idempotency via deduplication
    - Retry with exponential backoff
    """

    def __init__(self, max_rate: int = 100, max_concurrent: int = 10):
        self.queue: deque = deque()
        self.max_rate = max_rate  # Max operations per second
        self.max_concurrent = max_concurrent
        self.rate_window = []  # Sliding window for rate tracking
        self.running_operations: Set[str] = set()
        self.completed_operations: Dict[str, OperationResult] = {}
        self.idempotency_keys: Set[str] = set()

    async def enqueue(self, operation: BulkOperation) -> str:
        """Add operation to queue with idempotency check"""

        # Generate idempotency key if not provided
        if not operation.idempotency_key:
            operation.idempotency_key = self._generate_idempotency_key(operation)

        # Check idempotency
        if operation.idempotency_key in self.idempotency_keys:
            logger.info(f"Operation {operation.operation_id} already processed (idempotent)")
            return operation.operation_id

        # Add to idempotency set
        self.idempotency_keys.add(operation.idempotency_key)

        # Add to priority queue (lower priority number = higher priority)
        self.queue.append(operation)
        self.queue = deque(sorted(self.queue, key=lambda x: x.priority))

        logger.info(f"Operation {operation.operation_id} queued with {len(operation.incidents)} incidents")

        return operation.operation_id

    async def process_queue(self):
        """Process operations from queue with rate limiting and concurrency control"""

        while True:
            # Check if we can process more operations
            if not self._can_process():
                await asyncio.sleep(0.1)
                continue

            # Get next operation
            if not self.queue:
                await asyncio.sleep(0.1)
                continue

            operation = self.queue.popleft()

            # Execute operation
            asyncio.create_task(self._execute_operation(operation))

            await asyncio.sleep(0.01)  # Prevent tight loop

    def _can_process(self) -> bool:
        """Check if we can process more operations based on rate and concurrency limits"""

        # Check concurrency limit
        if len(self.running_operations) >= self.max_concurrent:
            return False

        # Check rate limit
        now = time.time()
        # Clean old entries from rate window (> 1 second old)
        self.rate_window = [t for t in self.rate_window if now - t < 1.0]

        if len(self.rate_window) >= self.max_rate:
            return False

        return True

    async def _execute_operation(self, operation: BulkOperation):
        """Execute bulk operation with retries"""

        self.running_operations.add(operation.operation_id)
        self.rate_window.append(time.time())

        results = []

        for incident_id in operation.incidents:
            result = await self._execute_with_retry(
                operation.operation_id,
                incident_id,
                operation.action,
                operation.params
            )
            results.append(result)

        # Store completion
        self.running_operations.remove(operation.operation_id)
        self.completed_operations[operation.operation_id] = {
            'total': len(results),
            'success': sum(1 for r in results if r.status == OperationStatus.SUCCESS),
            'failed': sum(1 for r in results if r.status == OperationStatus.FAILED),
            'results': results
        }

        logger.info(f"Operation {operation.operation_id} completed: {len(results)} incidents processed")

    async def _execute_with_retry(self, operation_id: str, incident_id: str,
                                  action: str, params: Dict,
                                  max_retries: int = 3) -> OperationResult:
        """Execute single incident operation with retry and backoff"""

        result = OperationResult(
            operation_id=operation_id,
            incident_id=incident_id,
            status=OperationStatus.PENDING,
            started_at=datetime.utcnow()
        )

        for attempt in range(max_retries):
            try:
                result.attempts = attempt + 1
                result.status = OperationStatus.RUNNING

                # Execute action (mock - replace with actual SOAR action)
                action_result = await self._perform_action(incident_id, action, params)

                result.status = OperationStatus.SUCCESS
                result.result = action_result
                result.completed_at = datetime.utcnow()

                return result

            except Exception as e:
                logger.error(f"Action {action} failed for incident {incident_id} (attempt {attempt + 1}): {e}")

                if attempt < max_retries - 1:
                    # Exponential backoff
                    backoff = 2 ** attempt
                    result.status = OperationStatus.RETRYING
                    await asyncio.sleep(backoff)
                else:
                    result.status = OperationStatus.FAILED
                    result.error = str(e)
                    result.completed_at = datetime.utcnow()

        return result

    async def _perform_action(self, incident_id: str, action: str, params: Dict) -> Dict:
        """Perform SOAR action (mock implementation)"""

        # Simulate action execution
        await asyncio.sleep(0.1)

        return {
            'incident_id': incident_id,
            'action': action,
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat()
        }

    def _generate_idempotency_key(self, operation: BulkOperation) -> str:
        """Generate idempotency key from operation attributes"""

        key_data = f"{operation.playbook_id}:{operation.action}:{sorted(operation.incidents)}"
        return hashlib.sha256(key_data.encode()).hexdigest()

    def get_status(self, operation_id: str) -> Optional[Dict]:
        """Get operation status"""

        if operation_id in self.running_operations:
            return {'status': 'running'}

        if operation_id in self.completed_operations:
            return self.completed_operations[operation_id]

        return None


class CircuitBreakerManager:
    """
    Circuit breaker manager for step-level failure isolation

    Features:
    - Per-step circuit breakers
    - Timeout enforcement
    - Failure isolation
    - Replay failing branch only
    """

    def __init__(self):
        self.breakers: Dict[str, CircuitBreaker] = {}

    async def execute_with_breaker(self, step_id: str, func, timeout_seconds: int = 30):
        """Execute function with circuit breaker protection"""

        # Get or create breaker
        if step_id not in self.breakers:
            self.breakers[step_id] = CircuitBreaker(
                step_id=step_id,
                timeout_seconds=timeout_seconds
            )

        breaker = self.breakers[step_id]

        # Check circuit state
        if breaker.state == CircuitBreakerState.OPEN:
            # Check if timeout has passed
            if breaker.last_failure_time:
                time_since_failure = (datetime.utcnow() - breaker.last_failure_time).seconds
                if time_since_failure >= breaker.timeout_seconds:
                    # Try half-open
                    breaker.state = CircuitBreakerState.HALF_OPEN
                    logger.info(f"Circuit breaker {step_id} entering HALF_OPEN state")
                else:
                    raise Exception(f"Circuit breaker {step_id} is OPEN (failing fast)")

        # Execute with timeout
        try:
            result = await asyncio.wait_for(func(), timeout=timeout_seconds)

            # Success - update breaker
            if breaker.state == CircuitBreakerState.HALF_OPEN:
                breaker.success_count += 1
                if breaker.success_count >= breaker.success_threshold:
                    breaker.state = CircuitBreakerState.CLOSED
                    breaker.failure_count = 0
                    breaker.success_count = 0
                    logger.info(f"Circuit breaker {step_id} closed (recovered)")

            return result

        except asyncio.TimeoutError:
            logger.error(f"Step {step_id} timed out after {timeout_seconds}s")
            self._record_failure(breaker)
            raise

        except Exception as e:
            logger.error(f"Step {step_id} failed: {e}")
            self._record_failure(breaker)
            raise

    def _record_failure(self, breaker: CircuitBreaker):
        """Record failure and potentially open circuit"""

        breaker.failure_count += 1
        breaker.last_failure_time = datetime.utcnow()
        breaker.success_count = 0

        if breaker.failure_count >= breaker.failure_threshold:
            breaker.state = CircuitBreakerState.OPEN
            logger.error(f"Circuit breaker {breaker.step_id} OPENED after {breaker.failure_count} failures")

    def reset_breaker(self, step_id: str):
        """Manually reset circuit breaker"""

        if step_id in self.breakers:
            self.breakers[step_id].state = CircuitBreakerState.CLOSED
            self.breakers[step_id].failure_count = 0
            self.breakers[step_id].success_count = 0
            logger.info(f"Circuit breaker {step_id} manually reset")

    def get_breaker_status(self, step_id: str) -> Optional[Dict]:
        """Get circuit breaker status"""

        if step_id in self.breakers:
            breaker = self.breakers[step_id]
            return {
                'step_id': step_id,
                'state': breaker.state.value,
                'failure_count': breaker.failure_count,
                'success_count': breaker.success_count,
                'last_failure_time': breaker.last_failure_time.isoformat() if breaker.last_failure_time else None
            }

        return None


# Example usage
async def example_bulk_operations():
    """Example bulk SOAR operations with circuit breakers"""

    # Create queue
    queue = BulkOperationQueue(max_rate=100, max_concurrent=10)

    # Create circuit breaker manager
    breaker_mgr = CircuitBreakerManager()

    # Create bulk operation
    operation = BulkOperation(
        operation_id='bulk_001',
        playbook_id='malware_response',
        incidents=['inc_1', 'inc_2', 'inc_3', 'inc_4', 'inc_5'],
        action='isolate',
        params={'isolation_level': 'full'},
        priority=1
    )

    # Enqueue
    await queue.enqueue(operation)

    # Start processing (in background)
    asyncio.create_task(queue.process_queue())

    # Wait for completion
    await asyncio.sleep(2)

    # Get status
    status = queue.get_status('bulk_001')
    print(f"Operation status: {status}")

    # Example circuit breaker usage
    async def risky_step():
        # Simulate step execution
        await asyncio.sleep(0.1)
        return {'status': 'success'}

    try:
        result = await breaker_mgr.execute_with_breaker('step_isolate', risky_step, timeout_seconds=5)
        print(f"Step result: {result}")
    except Exception as e:
        print(f"Step failed: {e}")

    # Get breaker status
    breaker_status = breaker_mgr.get_breaker_status('step_isolate')
    print(f"Circuit breaker status: {breaker_status}")


if __name__ == "__main__":
    asyncio.run(example_bulk_operations())
