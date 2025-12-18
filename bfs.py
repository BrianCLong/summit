from collections import deque
from typing import Dict, Iterable, List, Set, TypeVar

# Define a generic type variable for node identifiers
Node = TypeVar("Node")

def bfs(adjacency_list: Dict[Node, Iterable[Node]], source: Node) -> List[Node]:
    """Perform breadth-first search on a graph represented as an adjacency list.

    Args:
        adjacency_list: Mapping of node to its iterable of neighboring nodes.
        source: Node from which BFS traversal begins.

    Returns:
        List of nodes in the order they were visited.
    """
    # Track nodes that have been visited to avoid processing them multiple times.
    visited: Set[Node] = set()
    # Maintain the traversal order to return once the search is complete.
    order: List[Node] = []
    # Initialize the queue with the source node to start BFS.
    queue: deque[Node] = deque([source])

    # Continue processing until there are no nodes left to explore.
    while queue:
        # Remove the node at the front of the queue (FIFO order).
        current = queue.popleft()

        # Skip nodes that were already visited to prevent cycles.
        if current in visited:
            continue

        # Mark the current node as visited and record it in the traversal order.
        visited.add(current)
        order.append(current)

        # Enqueue all unvisited neighbors so they are processed in BFS order.
        for neighbor in adjacency_list.get(current, []):
            if neighbor not in visited:
                queue.append(neighbor)

    # Return the sequence of visited nodes reflecting BFS traversal.
    return order


if __name__ == "__main__":
    # Example graph represented as an adjacency list.
    graph = {
        "A": ["B", "C"],
        "B": ["D", "E"],
        "C": ["F"],
        "D": [],
        "E": ["F"],
        "F": [],
    }

    # Execute BFS starting from node "A" and print the traversal order.
    traversal = bfs(graph, "A")
    print(traversal)

    # Simple assertion to verify expected traversal order.
    assert traversal == ["A", "B", "C", "D", "E", "F"], "BFS traversal order is incorrect"
