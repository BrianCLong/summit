import re

# List of rules to enforce modern Angular patterns.
# Each rule has a name, description, regex (finding the BAD pattern), and suggested fix message.

RULES = [
    {
        "id": "AM-001",
        "name": "No NgModule",
        "regex": r"@NgModule\s*\(",
        "message": "Avoid @NgModule. Use standalone components, directives, and pipes."
    },
    {
        "id": "AM-002",
        "name": "No *ngIf",
        "regex": r"\*ngIf\s*=",
        "message": "Avoid *ngIf. Use the new @if control flow block."
    },
    {
        "id": "AM-003",
        "name": "No *ngFor",
        "regex": r"\*ngFor\s*=",
        "message": "Avoid *ngFor. Use the new @for control flow block."
    },
    {
        "id": "AM-004",
        "name": "No Constructor DI",
        "regex": r"constructor\s*\([^)]*(private|protected|public)\s+\w+\s*:\s*\w+",
        "message": "Avoid constructor injection. Use `inject()` for dependency injection."
    },
    {
        "id": "AM-005",
        "name": "No @Input Decorator",
        "regex": r"@Input\s*\(",
        "message": "Avoid @Input decorator. Use signal-based `input()` or `input.required()`."
    },
    {
        "id": "AM-006",
        "name": "No @Output Decorator",
        "regex": r"@Output\s*\(",
        "message": "Avoid @Output decorator. Use `output()`."
    }
]
