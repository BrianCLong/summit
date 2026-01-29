from typing import TypedDict, Any, List, Optional, Union

class AcpSession(TypedDict):
    id: str
    cwd: str

class AcpMessage(TypedDict):
    type: str
    content: Any
