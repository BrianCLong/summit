# UI Build Loop Skill

**Purpose:** Run an autonomous loop to complete a UI task, using `next-prompt.md` (the baton) to manage state and handoffs.

## Inputs
- `baton_path`: Path to the baton file (default: `next-prompt.md`).
- `max_iterations`: Maximum number of loop iterations.

## Outputs
- `final_state`: The content of the baton upon completion.
- `iterations_run`: Number of loops executed.

## Moats
- **Branch-Safe**: Baton state is versioned and can be merged.
- **Policy Gates**: Each iteration must pass policy checks before updating the baton.
