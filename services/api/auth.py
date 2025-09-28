from fastapi import Depends, HTTPException, Header
from enum import Enum

class Role(str, Enum):
    analyst="analyst"; lead="lead"; admin="admin"

def require_role(min_role: Role):
    rank={"analyst":0,"lead":1,"admin":2}
    async def dep(x_role: str | None = Header(default="analyst", alias="X-Role")):
        r = (x_role or "analyst").lower()
        if rank.get(r,0) < rank[min_role.value]:
            raise HTTPException(status_code=403, detail=f"role {r} < required {min_role.value}")
        return r
    return dep