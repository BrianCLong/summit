import requests
from maestro_sdk.task import define_task
from maestro_sdk.types import RunContext

http_get = define_task(
    {
        "validate": lambda input: (
            (_ for _ in ()).throw(Exception("url required")) if not input.get("url") else None
        ),
        "execute": lambda ctx, input: {"status": requests.get(input["url"]).status_code},
    }
)

if __name__ == "__main__":
    ctx = RunContext()
    print(http_get.execute(ctx, {"url": "https://example.com"}))
