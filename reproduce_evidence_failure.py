import json

# Simulate the structure of evidence/index.json causing the failure
# The failure log shows: AttributeError: 'list' object has no attribute 'items'
# This implies that idx.get("items", {}) returned a list, not a dict.
# Let's verify if the current evidence/index.json has "items" as a list or dict.

try:
    with open("evidence/index.json", "r") as f:
        data = json.load(f)
        items = data.get("items", {})
        print(f"Type of items: {type(items)}")

        # This is the line that failed in the CI
        for key, item in items.items():
            pass
        print("Iteration successful")

except AttributeError as e:
    print(f"Caught expected error: {e}")
except Exception as e:
    print(f"Caught unexpected error: {e}")
