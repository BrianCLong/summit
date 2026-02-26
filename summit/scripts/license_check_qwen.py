import argparse
import sys


def verify_qwen_license(license_type: str) -> bool:
    """
    Verifies if the Qwen license is OSI-approved or a known open-source license.
    """
    # Qwen models typically use the Qwen License or Apache 2.0.
    # For the purpose of this gate, we accept Apache-2.0, MIT, or the custom Qwen License.
    allowed_licenses = ["Apache-2.0", "MIT", "Qwen-License"]

    if license_type in allowed_licenses:
        return True
    return False

def main():
    parser = argparse.ArgumentParser(description="Qwen License Verification Gate")
    parser.add_argument("--license", required=True, help="License type to verify")
    args = parser.parse_args()

    if verify_qwen_license(args.license):
        print(f"License '{args.license}' verified successfully.")
        sys.exit(0)
    else:
        print(f"Error: License '{args.license}' is not approved.")
        sys.exit(1)

if __name__ == "__main__":
    main()
