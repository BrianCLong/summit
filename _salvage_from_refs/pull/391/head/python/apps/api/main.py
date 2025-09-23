from datetime import timedelta

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from .auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    RoleChecker,
    authenticate_user,
    create_access_token,
    get_current_user,
)

app = FastAPI(title="Intelgraph API")

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token(
        data={"sub": user["username"], "roles": user["roles"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", dependencies=[Depends(RoleChecker(["admin", "analyst", "viewer"]))])
def read_users_me(current_user=Depends(get_current_user)):
    return current_user

@app.get("/admin", dependencies=[Depends(RoleChecker(["admin"]))])
def read_admin():
    return {"msg": "admin access"}
