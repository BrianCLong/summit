import sys

filepath = 'docs/api-spec.yaml'
with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)

    # Missing description fixes
    if "operationId: getHealth" in line:
        new_lines.append("      description: Check the health of the API service.\n")
    if "operationId: createTenant" in line:
        # already has description, check next warnings
        pass
    if "operationId: previewRoute" in line:
        new_lines.append("      description: Preview the routing decision for a given task.\n")
    if "operationId: executeRoute" in line:
        new_lines.append("      description: Execute a task using the selected route candidates.\n")
    if "operationId: getWebInterfaces" in line:
        new_lines.append("      description: Retrieve available web interfaces for orchestration.\n")
    if "operationId: runWebOrchestration" in line:
        new_lines.append("      description: Run a web orchestration task.\n")
    if "operationId: getBudgets" in line:
        new_lines.append("      description: Retrieve budget information for the tenant.\n")
    if "operationId: checkPolicy" in line:
        new_lines.append("      description: Check if an action is allowed by policy.\n")
    if "operationId: createRun" in line:
        new_lines.append("      description: Create a new run instance.\n")
    if "operationId: createWorkflowDefinition" in line:
        new_lines.append("      description: Create or update a workflow definition.\n")
    if "operationId: startRun" in line:
        new_lines.append("      description: Start a run execution.\n")
    if "operationId: getRun" in line:
        new_lines.append("      description: Get details of a specific run.\n")
    if "operationId: approveRun" in line:
        new_lines.append("      description: Approve a run that is pending approval.\n")
    if "operationId: getRunEvents" in line:
        new_lines.append("      description: Get the event log for a specific run.\n")

with open(filepath, 'w') as f:
    f.writelines(new_lines)
