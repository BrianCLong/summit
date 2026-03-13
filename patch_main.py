import sys

with open("summit/main.py", "r") as f:
    content = f.read()

# Add import
import_stmt = "from summit.alerts.api import router as alerts_router\n"
if "from summit.api.factgov.router" in content:
    content = content.replace("from summit.api.factgov.router import router as factgov_router",
                              "from summit.api.factgov.router import router as factgov_router\n" + import_stmt)

# Add route include
include_stmt = "app.include_router(alerts_router)\n"
if "app.include_router(factgov_router)" in content:
    content = content.replace("app.include_router(factgov_router)",
                              "app.include_router(factgov_router)\n" + include_stmt)

with open("summit/main.py", "w") as f:
    f.write(content)
