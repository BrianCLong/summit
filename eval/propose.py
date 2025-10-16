import json

import yaml


def main():
    try:
        with open("eval/out/results.json") as f:
            results = json.load(f)
    except FileNotFoundError:
        print("eval/out/results.json not found. Cannot propose weights.")
        return

    # Extract unique models from results
    models = sorted(list(set(item["model"] for item in results)))

    # Create dummy weights (e.g., equal distribution)
    num_models = len(models)
    if num_models == 0:
        print("No models found in results. Cannot propose weights.")
        return

    weight_per_model = 1.0 / num_models
    weights = {model: round(weight_per_model, 2) for model in models}

    # Assuming a single route for now, as per router.yaml
    router_weights = {"nlp/summarize": weights}

    with open("router/weights.yaml", "w") as f:
        yaml.dump(router_weights, f, indent=2)

    print("Generated router/weights.yaml with proposed weights.")


if __name__ == "__main__":
    main()
