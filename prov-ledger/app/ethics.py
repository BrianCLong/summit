from fastapi import HTTPException

BANNED = {"influence", "targeting", "microtargeting", "fear trigger", "make more convincing"}


def check_request(content: str) -> None:
    lowered = content.lower()
    for word in BANNED:
        if word in lowered:
            raise HTTPException(status_code=400, detail="disallowed_persuasion_output")
