-- Durable Work Orchestration schema (MVP)
-- Governed by Summit Readiness Assertion and OPA policy gates.

CREATE TABLE durable_work_tasks (
    id UUID PRIMARY KEY,
    convoy_id UUID,
    formula_id UUID,
    molecule_id UUID,
    step_id UUID,
    status TEXT CHECK (status IN (
        'pending', 'ready', 'running', 'blocked', 'waiting', 'completed', 'failed', 'cancelled', 'paused'
    )) NOT NULL DEFAULT 'pending',
    assignee_agent_id UUID,
    hook_id UUID,
    dependencies UUID[] DEFAULT '{}',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    acceptance_criteria TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE durable_work_convoys (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('forming', 'in-progress', 'blocked', 'completed', 'failed', 'cancelled')) NOT NULL DEFAULT 'forming',
    task_ids UUID[] DEFAULT '{}',
    molecule_ids UUID[] DEFAULT '{}',
    target_completion TIMESTAMPTZ,
    progress JSONB NOT NULL DEFAULT '{"totalTasks":0,"completedTasks":0,"failedTasks":0}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE durable_work_agents (
    id UUID PRIMARY KEY,
    handle TEXT NOT NULL,
    role TEXT CHECK (role IN ('planner', 'witness', 'refinery', 'deacon', 'worker')) NOT NULL,
    capabilities TEXT[] DEFAULT '{}',
    hook_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE durable_work_hooks (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    status TEXT CHECK (status IN ('idle', 'active', 'paused', 'draining')) NOT NULL DEFAULT 'idle',
    queue_depth INTEGER NOT NULL DEFAULT 0,
    assigned_task_ids UUID[] DEFAULT '{}',
    last_claimed_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE durable_work_formulas (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    template JSONB NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE durable_work_molecules (
    id UUID PRIMARY KEY,
    formula_id UUID NOT NULL,
    convoy_id UUID NOT NULL,
    status TEXT CHECK (status IN (
        'pending', 'ready', 'running', 'blocked', 'waiting', 'completed', 'failed', 'cancelled', 'paused'
    )) NOT NULL DEFAULT 'pending',
    step_ids UUID[] DEFAULT '{}',
    cursor UUID,
    inputs JSONB NOT NULL DEFAULT '{}',
    outputs JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE durable_work_steps (
    id UUID PRIMARY KEY,
    molecule_id UUID NOT NULL,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN (
        'pending', 'ready', 'running', 'blocked', 'waiting', 'completed', 'failed', 'cancelled', 'paused'
    )) NOT NULL DEFAULT 'pending',
    depends_on UUID[] DEFAULT '{}',
    acceptance_criteria TEXT[] DEFAULT '{}',
    assigned_hook_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE durable_work_events (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT CHECK (entity_type IN (
        'task', 'convoy', 'agent', 'hook', 'molecule', 'formula', 'run-digest'
    )) NOT NULL,
    entity_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    level TEXT CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')) NOT NULL DEFAULT 'info',
    payload JSONB NOT NULL DEFAULT '{}',
    actor_agent_id UUID,
    wisp_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE durable_work_run_digests (
    id UUID PRIMARY KEY,
    convoy_id UUID,
    wisp_id UUID NOT NULL,
    summary TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    event_count INTEGER NOT NULL DEFAULT 0,
    digest JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
