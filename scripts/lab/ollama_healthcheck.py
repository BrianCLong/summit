import sys
import requests

def check_health(base_url="http://localhost:11434"):
    try:
        response = requests.get(base_url)
        response.raise_for_status()

        # Check if Ollama is running (returns "Ollama is running" usually)
        if response.status_code == 200:
            print(f"✅ Ollama healthcheck passed at {base_url}: {response.text.strip()}")
            return True
        else:
            print(f"❌ Ollama healthcheck failed with status {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to Ollama at {base_url}. Is the service running?")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama healthcheck failed: {e}")
        return False

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:11434"
    success = check_health(url)
    sys.exit(0 if success else 1)
