from typing import Any, List, Optional, TypedDict, Union


class AcpSession(TypedDict):
    id: str
    cwd: str

class AcpMessage(TypedDict):
    type: str
    content: Any
