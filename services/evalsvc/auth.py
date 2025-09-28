from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt, os
from typing import List, Set

bearer = HTTPBearer(auto_error=False)
JWT_AUD = os.getenv("JWT_AUD","intelgraph")
JWT_ISS = os.getenv("JWT_ISS","intelgraph-auth")
JWT_KEY = os.getenv("JWT_KEY","dev-insecure-key") # In production, this should be a strong secret key

def require_role(*allowed_roles: str):
    async def _inner(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer)):
        if not creds: raise HTTPException(status_code=401, detail="Missing token")
        try:
            tok = jwt.decode(creds.credentials, JWT_KEY, algorithms=["HS256"], audience=JWT_AUD, issuer=JWT_ISS)
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Bad token: {e}")
        
        user_roles = set(tok.get("roles", []))
        if not user_roles.intersection(set(allowed_roles)):
            raise HTTPException(status_code=403, detail="Forbidden")
        
        request.state.user = tok.get("sub","unknown")
        request.state.roles = user_roles
        return True
    return _inner
