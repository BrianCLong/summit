import subprocess
import sys


def main():
    print("Verifying campaign contracts via pytest...")
    retcode = subprocess.call(["pytest", "tests/test_campaign_contracts.py"])
    sys.exit(retcode)

if __name__ == "__main__":
    main()
