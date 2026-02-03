import subprocess
import sys


def main():
    print("Verifying federation contracts via pytest...")
    retcode = subprocess.call(["pytest", "tests/test_federation_deny_by_default.py"])
    sys.exit(retcode)

if __name__ == "__main__":
    main()
