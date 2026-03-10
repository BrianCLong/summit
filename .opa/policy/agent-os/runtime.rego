package agent_os.runtime

default allow = false

allow {
    input.task.budgetClass != "l"
}

allow {
    input.options.maxMemoryMB >= 1024
}
