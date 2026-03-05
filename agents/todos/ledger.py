from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

TodoStatus = Literal["pending", "in_progress", "done"]


@dataclass
class TodoItem:
    id: int
    task: str
    status: TodoStatus = "pending"


class TodoLedger:
    def __init__(self, todos: list[TodoItem] | None = None) -> None:
        self._todos = todos or []

    @classmethod
    def empty(cls) -> TodoLedger:
        return cls([])

    @property
    def todos(self) -> list[TodoItem]:
        return self._todos

    def add(self, task: str) -> TodoItem:
        next_id = max((todo.id for todo in self._todos), default=0) + 1
        item = TodoItem(id=next_id, task=task)
        self._todos.append(item)
        return item

    def set_status(self, todo_id: int, status: TodoStatus) -> TodoItem:
        for todo in self._todos:
            if todo.id == todo_id:
                todo.status = status
                return todo
        raise KeyError(f"todo id {todo_id} not found")

    def to_dict(self) -> dict[str, object]:
        return {"todos": [asdict(todo) for todo in self._todos]}

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> TodoLedger:
        raw_todos = payload.get("todos", [])
        todos = [TodoItem(**todo) for todo in raw_todos if isinstance(todo, dict)]
        return cls(todos)
