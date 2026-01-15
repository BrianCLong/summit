from intelgraph.sdk import IntelGraphClient


def main():
    print("Initializing IntelGraphClient...")
    client = IntelGraphClient()

    text = "Hello, IntelGraph! My email is user@example.com."
    print(f"Processing text: {text}")

    result = client.process(text)
    print("Result:", result)

    if result["ok"]:
        print("Success!")
    else:
        print("Failed.")


if __name__ == "__main__":
    main()
