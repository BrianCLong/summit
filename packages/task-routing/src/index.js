"use strict";
/**
 * Intelligent Task Routing System
 * Provides skill-based routing, load balancing, SLA management, and dynamic task assignment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRouter = void 0;
const events_1 = require("events");
class TaskRouter extends events_1.EventEmitter {
    workers = new Map();
    tasks = new Map();
    workerAssignmentCount = new Map();
    routingStrategy;
    escalationPolicies = [];
    roundRobinIndex = 0;
    constructor(strategy = { type: 'skill-based' }) {
        super();
        this.routingStrategy = strategy;
        this.startEscalationMonitor();
    }
    /**
     * Register a worker in the routing system
     */
    registerWorker(worker) {
        this.workers.set(worker.id, worker);
        this.workerAssignmentCount.set(worker.id, 0);
        this.emit('worker.registered', worker);
    }
    /**
     * Unregister a worker from the routing system
     */
    unregisterWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (worker) {
            // Reassign tasks from this worker
            const workerTasks = Array.from(this.tasks.values()).filter((t) => t.assignedTo === workerId);
            workerTasks.forEach((task) => this.reassignTask(task.id));
            this.workers.delete(workerId);
            this.workerAssignmentCount.delete(workerId);
            this.emit('worker.unregistered', worker);
        }
    }
    /**
     * Update worker availability
     */
    updateWorkerAvailability(workerId, availability) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.availability = availability;
            this.emit('worker.availability.updated', worker);
            if (availability === 'offline') {
                // Reassign tasks if worker goes offline
                const workerTasks = Array.from(this.tasks.values()).filter((t) => t.assignedTo === workerId && t.status === 'assigned');
                workerTasks.forEach((task) => this.reassignTask(task.id));
            }
        }
    }
    /**
     * Update worker current load
     */
    updateWorkerLoad(workerId, load) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.currentLoad = load;
            this.emit('worker.load.updated', worker);
        }
    }
    /**
     * Assign a task using the configured routing strategy
     */
    async assignTask(task) {
        this.tasks.set(task.id, task);
        const eligibleWorkers = this.findEligibleWorkers(task);
        if (eligibleWorkers.length === 0) {
            this.emit('task.no_eligible_workers', task);
            return null;
        }
        let selectedWorker = null;
        switch (this.routingStrategy.type) {
            case 'round-robin':
                selectedWorker = this.roundRobinSelection(eligibleWorkers);
                break;
            case 'least-loaded':
                selectedWorker = this.leastLoadedSelection(eligibleWorkers);
                break;
            case 'skill-based':
                selectedWorker = this.skillBasedSelection(eligibleWorkers, task);
                break;
            case 'priority-based':
                selectedWorker = this.priorityBasedSelection(eligibleWorkers, task);
                break;
            case 'performance-based':
                selectedWorker = this.performanceBasedSelection(eligibleWorkers);
                break;
            case 'geographic':
                selectedWorker = this.geographicSelection(eligibleWorkers, task);
                break;
            case 'custom':
                selectedWorker = await this.customSelection(eligibleWorkers, task, this.routingStrategy.config);
                break;
            default:
                selectedWorker = this.skillBasedSelection(eligibleWorkers, task);
        }
        if (selectedWorker) {
            task.assignedTo = selectedWorker.id;
            task.assignedAt = new Date();
            task.status = 'assigned';
            selectedWorker.currentLoad++;
            this.workerAssignmentCount.set(selectedWorker.id, (this.workerAssignmentCount.get(selectedWorker.id) || 0) + 1);
            this.emit('task.assigned', task, selectedWorker);
            return selectedWorker.id;
        }
        return null;
    }
    /**
     * Reassign a task to a different worker
     */
    async reassignTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }
        // Clear previous assignment
        if (task.assignedTo) {
            const previousWorker = this.workers.get(task.assignedTo);
            if (previousWorker) {
                previousWorker.currentLoad = Math.max(0, previousWorker.currentLoad - 1);
            }
        }
        task.assignedTo = undefined;
        task.assignedAt = undefined;
        task.status = 'pending';
        // Reassign using routing strategy
        await this.assignTask(task);
    }
    /**
     * Find workers eligible for a task based on skills and availability
     */
    findEligibleWorkers(task) {
        return Array.from(this.workers.values()).filter((worker) => {
            // Check availability
            if (worker.availability !== 'available') {
                return false;
            }
            // Check capacity
            if (worker.currentLoad >= worker.capacity) {
                return false;
            }
            // Check skills
            if (task.requiredSkills.length > 0) {
                const hasAllSkills = task.requiredSkills.every((skill) => worker.skills.includes(skill));
                if (!hasAllSkills) {
                    return false;
                }
                // Check minimum skill level if specified
                if (task.minimumSkillLevel) {
                    const meetsSkillLevel = task.requiredSkills.every((skill) => (worker.skillLevels[skill] || 0) >= (task.minimumSkillLevel || 0));
                    if (!meetsSkillLevel) {
                        return false;
                    }
                }
            }
            return true;
        });
    }
    /**
     * Round-robin selection strategy
     */
    roundRobinSelection(workers) {
        const worker = workers[this.roundRobinIndex % workers.length];
        this.roundRobinIndex = (this.roundRobinIndex + 1) % workers.length;
        return worker;
    }
    /**
     * Least-loaded selection strategy
     */
    leastLoadedSelection(workers) {
        return workers.reduce((prev, current) => current.currentLoad < prev.currentLoad ? current : prev);
    }
    /**
     * Skill-based selection strategy
     */
    skillBasedSelection(workers, task) {
        // Calculate skill match score for each worker
        const scoredWorkers = workers.map((worker) => {
            let score = 0;
            // Score based on skill levels
            task.requiredSkills.forEach((skill) => {
                score += worker.skillLevels[skill] || 0;
            });
            // Bonus for lower current load
            score += (worker.capacity - worker.currentLoad) * 0.5;
            // Bonus for performance rating
            score += worker.performanceRating * 0.3;
            return { worker, score };
        });
        // Sort by score (descending) and select top worker
        scoredWorkers.sort((a, b) => b.score - a.score);
        return scoredWorkers[0].worker;
    }
    /**
     * Priority-based selection strategy
     */
    priorityBasedSelection(workers, task) {
        // For high/critical priority, select best performer with lowest load
        if (task.priority === 'high' || task.priority === 'critical') {
            return workers
                .filter((w) => w.performanceRating >= 7)
                .sort((a, b) => {
                // First by performance, then by load
                if (b.performanceRating !== a.performanceRating) {
                    return b.performanceRating - a.performanceRating;
                }
                return a.currentLoad - b.currentLoad;
            })[0] || this.leastLoadedSelection(workers);
        }
        // For low/medium priority, use least-loaded
        return this.leastLoadedSelection(workers);
    }
    /**
     * Performance-based selection strategy
     */
    performanceBasedSelection(workers) {
        return workers.reduce((prev, current) => current.performanceRating > prev.performanceRating ? current : prev);
    }
    /**
     * Geographic selection strategy
     */
    geographicSelection(workers, task) {
        const taskLocation = task.metadata?.location;
        if (taskLocation) {
            const localWorkers = workers.filter((w) => w.location === taskLocation);
            if (localWorkers.length > 0) {
                return this.skillBasedSelection(localWorkers, task);
            }
        }
        // Fallback to skill-based if no location match
        return this.skillBasedSelection(workers, task);
    }
    /**
     * Custom selection strategy
     */
    async customSelection(workers, task, config) {
        // Custom logic can be implemented here based on config
        // Default to skill-based for now
        return this.skillBasedSelection(workers, task);
    }
    /**
     * Add an escalation policy
     */
    addEscalationPolicy(policy) {
        this.escalationPolicies.push(policy);
        this.emit('escalation.policy.added', policy);
    }
    /**
     * Remove an escalation policy
     */
    removeEscalationPolicy(policyId) {
        const index = this.escalationPolicies.findIndex((p) => p.id === policyId);
        if (index !== -1) {
            const policy = this.escalationPolicies.splice(index, 1)[0];
            this.emit('escalation.policy.removed', policy);
        }
    }
    /**
     * Start monitoring for escalations
     */
    startEscalationMonitor() {
        setInterval(() => {
            this.checkEscalations();
        }, 60000); // Check every minute
    }
    /**
     * Check all tasks for escalation conditions
     */
    async checkEscalations() {
        for (const task of this.tasks.values()) {
            if (task.status === 'completed') {
                continue;
            }
            for (const policy of this.escalationPolicies) {
                if (!policy.enabled) {
                    continue;
                }
                const shouldEscalate = this.shouldEscalate(task, policy);
                if (shouldEscalate) {
                    await this.executeEscalation(task, policy);
                }
            }
        }
    }
    /**
     * Check if a task should be escalated based on policy conditions
     */
    shouldEscalate(task, policy) {
        return policy.conditions.some((condition) => {
            switch (condition.type) {
                case 'time-based':
                    if (task.assignedAt && condition.threshold) {
                        const minutesSinceAssignment = (Date.now() - task.assignedAt.getTime()) / (1000 * 60);
                        return minutesSinceAssignment > condition.threshold;
                    }
                    return false;
                case 'sla-breach':
                    if (task.sla && task.createdAt) {
                        const minutesSinceCreation = (Date.now() - task.createdAt.getTime()) / (1000 * 60);
                        return minutesSinceCreation > task.sla.responseTime;
                    }
                    return false;
                case 'no-response':
                    return (task.status === 'assigned' &&
                        task.assignedAt &&
                        Date.now() - task.assignedAt.getTime() >
                            (condition.threshold || 30) * 60 * 1000);
                case 'custom':
                    return condition.customCheck ? condition.customCheck(task) : false;
                default:
                    return false;
            }
        });
    }
    /**
     * Execute escalation actions for a task
     */
    async executeEscalation(task, policy) {
        task.status = 'escalated';
        this.emit('task.escalated', task, policy);
        for (const action of policy.actions) {
            switch (action.type) {
                case 'reassign':
                    await this.reassignTask(task.id);
                    break;
                case 'notify':
                    this.emit('task.escalation.notify', task, action.target);
                    break;
                case 'priority-increase':
                    if (task.priority === 'low') {
                        task.priority = 'medium';
                    }
                    else if (task.priority === 'medium') {
                        task.priority = 'high';
                    }
                    else if (task.priority === 'high') {
                        task.priority = 'critical';
                    }
                    break;
                case 'custom':
                    if (action.customAction) {
                        await action.customAction(task);
                    }
                    break;
            }
        }
    }
    /**
     * Get routing statistics
     */
    getStatistics() {
        const availableWorkers = Array.from(this.workers.values()).filter((w) => w.availability === 'available');
        const assignedTasks = Array.from(this.tasks.values()).filter((t) => t.status === 'assigned' || t.status === 'in_progress');
        const pendingTasks = Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
        const averageLoad = this.workers.size > 0
            ? Array.from(this.workers.values()).reduce((sum, w) => sum + w.currentLoad, 0) / this.workers.size
            : 0;
        const workerUtilization = {};
        this.workers.forEach((worker) => {
            workerUtilization[worker.id] =
                worker.capacity > 0 ? (worker.currentLoad / worker.capacity) * 100 : 0;
        });
        return {
            totalWorkers: this.workers.size,
            availableWorkers: availableWorkers.length,
            totalTasks: this.tasks.size,
            assignedTasks: assignedTasks.length,
            pendingTasks: pendingTasks.length,
            averageLoad,
            workerUtilization,
        };
    }
    /**
     * Get task queue for a specific worker
     */
    getWorkerTasks(workerId) {
        return Array.from(this.tasks.values()).filter((t) => t.assignedTo === workerId);
    }
    /**
     * Get all workers
     */
    getWorkers() {
        return Array.from(this.workers.values());
    }
    /**
     * Get all tasks
     */
    getTasks() {
        return Array.from(this.tasks.values());
    }
}
exports.TaskRouter = TaskRouter;
exports.default = TaskRouter;
