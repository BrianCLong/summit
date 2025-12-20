#!/usr/bin/env python3
"""
IntelGraph Ingestion Wizard

Interactive CLI for configuring and running connector ingestion with:
- Auto-proposed field mappings
- PII detection and flags
- License enforcement
- Lineage recording
"""

import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

# Add connectors SDK to path
CONNECTORS_DIR = Path(__file__).parent.parent / "connectors"
sys.path.insert(0, str(CONNECTORS_DIR))

from sdk.base import BaseConnector
from sdk.pii import PIIDetector, PIIField, PIISeverity, RedactionPolicy
from sdk.license import LicenseEnforcer, LicenseConfig
from sdk.validator import validate_manifest


class Colors:
    """Terminal colors for better UX."""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'


class IngestWizard:
    """Interactive ingestion wizard."""

    def __init__(self):
        self.connector_path = None
        self.manifest = None
        self.connector = None
        self.field_mappings = {}
        self.pii_decisions = {}
        self.lineage_records = []

    def print_header(self, text: str):
        """Print a formatted header."""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
        print(f"  {text}")
        print(f"{'='*70}{Colors.END}\n")

    def print_info(self, text: str):
        """Print info message."""
        print(f"{Colors.CYAN}ℹ {text}{Colors.END}")

    def print_success(self, text: str):
        """Print success message."""
        print(f"{Colors.GREEN}✓ {text}{Colors.END}")

    def print_warning(self, text: str):
        """Print warning message."""
        print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

    def print_error(self, text: str):
        """Print error message."""
        print(f"{Colors.RED}✗ {text}{Colors.END}")

    def prompt(self, question: str, default: str = None) -> str:
        """Prompt user for input."""
        if default:
            response = input(f"{Colors.BOLD}{question}{Colors.END} [{default}]: ").strip()
            return response or default
        else:
            return input(f"{Colors.BOLD}{question}{Colors.END}: ").strip()

    def confirm(self, question: str, default: bool = True) -> bool:
        """Ask yes/no question."""
        default_str = "Y/n" if default else "y/N"
        response = input(f"{Colors.BOLD}{question}{Colors.END} [{default_str}]: ").strip().lower()

        if not response:
            return default
        return response in ['y', 'yes']

    def select_connector(self):
        """List available connectors and let user select one."""
        self.print_header("Select Connector")

        # Find all connectors
        connectors = []
        for connector_dir in CONNECTORS_DIR.iterdir():
            if connector_dir.is_dir() and (connector_dir / "manifest.yaml").exists():
                connectors.append(connector_dir)

        if not connectors:
            self.print_error("No connectors found!")
            sys.exit(1)

        # Display connectors
        print("Available connectors:\n")
        for i, connector_dir in enumerate(connectors, 1):
            manifest_path = connector_dir / "manifest.yaml"
            with open(manifest_path) as f:
                manifest = yaml.safe_load(f)

            print(f"  {i}. {Colors.BOLD}{manifest['name']}{Colors.END}")
            print(f"     {manifest.get('description', 'No description')}")
            print(f"     Type: {manifest.get('ingestion_type', 'unknown')}")
            print()

        # Get selection
        while True:
            try:
                choice = int(self.prompt("Select connector", "1"))
                if 1 <= choice <= len(connectors):
                    self.connector_path = connectors[choice - 1]
                    break
                else:
                    self.print_error(f"Please enter a number between 1 and {len(connectors)}")
            except ValueError:
                self.print_error("Please enter a valid number")

        # Load manifest
        manifest_path = self.connector_path / "manifest.yaml"
        with open(manifest_path) as f:
            self.manifest = yaml.safe_load(f)

        self.print_success(f"Selected connector: {self.manifest['name']}")

    def validate_connector(self):
        """Validate connector manifest."""
        self.print_header("Validating Connector")

        manifest_path = self.connector_path / "manifest.yaml"
        report = validate_manifest(str(manifest_path))

        if report['valid']:
            self.print_success("Connector manifest is valid!")
        else:
            self.print_error("Connector manifest has errors:")
            for error in report['errors']:
                print(f"  - {error}")

        if report['warnings']:
            self.print_warning("Warnings:")
            for warning in report['warnings']:
                print(f"  - {warning}")

        if not report['valid']:
            if not self.confirm("Continue anyway?", default=False):
                sys.exit(1)

    def propose_field_mappings(self):
        """Propose field mappings based on sample data."""
        self.print_header("Field Mapping Proposal")

        # Load sample data to analyze fields
        sample_file = self.connector_path / self.manifest.get('sample_data_file', 'sample.csv')

        if not sample_file.exists():
            self.print_warning(f"Sample file not found: {sample_file}")
            return

        # Detect fields based on file type
        fields = []
        if sample_file.suffix == '.csv':
            import csv
            with open(sample_file) as f:
                reader = csv.DictReader(f)
                fields = reader.fieldnames or []

        elif sample_file.suffix == '.json':
            with open(sample_file) as f:
                data = json.load(f)
                if isinstance(data, dict):
                    fields = list(data.keys())
                elif isinstance(data, list) and data:
                    fields = list(data[0].keys())

        if not fields:
            self.print_warning("Could not detect fields from sample data")
            return

        self.print_info(f"Detected {len(fields)} fields in sample data:\n")

        # Propose mappings with PII detection
        for field in fields:
            # Suggest entity mapping
            entity_type = self._suggest_entity_type(field)
            pii_risk = self._assess_pii_risk(field)

            print(f"  {Colors.BOLD}{field}{Colors.END}")
            print(f"    Suggested entity type: {entity_type}")

            if pii_risk != "none":
                pii_color = Colors.RED if pii_risk == "high" else Colors.YELLOW
                print(f"    {pii_color}PII Risk: {pii_risk.upper()}{Colors.END}")

            print()

            # Store mapping
            self.field_mappings[field] = {
                "entity_type": entity_type,
                "pii_risk": pii_risk,
            }

    def _suggest_entity_type(self, field_name: str) -> str:
        """Suggest entity type based on field name."""
        field_lower = field_name.lower()

        # Common patterns
        if any(x in field_lower for x in ['person', 'name', 'user', 'author', 'actor']):
            return "Person"
        elif any(x in field_lower for x in ['org', 'company', 'organization']):
            return "Organization"
        elif any(x in field_lower for x in ['ip', 'address', 'host']):
            return "IPAddress"
        elif any(x in field_lower for x in ['domain', 'url', 'website']):
            return "Domain"
        elif any(x in field_lower for x in ['email', 'mail']):
            return "Email"
        elif any(x in field_lower for x in ['phone', 'mobile', 'tel']):
            return "PhoneNumber"
        elif any(x in field_lower for x in ['location', 'place', 'city', 'country']):
            return "Location"
        elif any(x in field_lower for x in ['project', 'campaign']):
            return "Project"
        else:
            return "Entity"

    def _assess_pii_risk(self, field_name: str) -> str:
        """Assess PII risk level for a field."""
        field_lower = field_name.lower()

        # High risk PII
        high_risk = ['ssn', 'social_security', 'credit_card', 'password', 'secret']
        if any(x in field_lower for x in high_risk):
            return "high"

        # Medium risk PII
        medium_risk = ['name', 'email', 'phone', 'address', 'dob', 'birth']
        if any(x in field_lower for x in medium_risk):
            return "medium"

        # Low risk
        low_risk = ['user', 'author', 'account']
        if any(x in field_lower for x in low_risk):
            return "low"

        return "none"

    def review_pii_flags(self):
        """Review PII flags from manifest and get user decisions."""
        self.print_header("PII Review")

        pii_flags = self.manifest.get('pii_flags', [])

        if not pii_flags:
            self.print_info("No PII flags defined in manifest")
            return

        for pii_config in pii_flags:
            if isinstance(pii_config, dict):
                field_name = pii_config.get('field_name', 'unknown')
                description = pii_config.get('description', '')
                severity = pii_config.get('severity', 'medium')
                policy = pii_config.get('redaction_policy', 'allow')

                # Color based on severity
                color = Colors.RED if severity in ['high', 'critical'] else Colors.YELLOW

                print(f"{color}Field: {Colors.BOLD}{field_name}{Colors.END}{color}")
                print(f"  {description}")
                print(f"  Severity: {severity.upper()}")
                print(f"  Policy: {policy}{Colors.END}\n")

                # If policy is 'prompt', ask user
                if policy == 'prompt':
                    decision = self.prompt(
                        f"  How to handle '{field_name}'? (allow/redact/block)",
                        default="redact"
                    )
                    self.pii_decisions[field_name] = decision
                    self.print_success(f"  Will {decision} field '{field_name}'")
                    print()

    def review_license_restrictions(self):
        """Review and display license restrictions."""
        self.print_header("License & Compliance")

        license_config = self.manifest.get('license', {})

        if isinstance(license_config, str):
            self.print_info(f"License: {license_config}")
            return

        # Display license info
        print(f"{Colors.BOLD}License Type:{Colors.END} {license_config.get('type', 'unknown')}")
        print(f"{Colors.BOLD}Classification:{Colors.END} {license_config.get('classification', 'unknown')}")

        if license_config.get('attribution_required'):
            self.print_warning("Attribution required for this data source")

        # Show allowed use cases
        allowed = license_config.get('allowed_use_cases', [])
        if allowed:
            print(f"\n{Colors.GREEN}Allowed use cases:{Colors.END}")
            for use_case in allowed:
                print(f"  ✓ {use_case}")

        # Show blocked use cases
        blocked = license_config.get('blocked_use_cases', [])
        if blocked:
            print(f"\n{Colors.RED}Prohibited use cases:{Colors.END}")
            for use_case in blocked:
                print(f"  ✗ {use_case}")

        # Show blocked fields
        blocked_fields = license_config.get('blocked_fields', [])
        if blocked_fields:
            print(f"\n{Colors.RED}Blocked fields:{Colors.END}")
            for bf in blocked_fields:
                field_name = bf.get('field_name', 'unknown')
                reason = bf.get('reason', 'No reason provided')
                print(f"  {Colors.BOLD}{field_name}{Colors.END}: {reason}")

                alternative = bf.get('alternative')
                if alternative:
                    print(f"    {Colors.CYAN}Alternative: {alternative}{Colors.END}")

    def run_ingestion(self):
        """Run the actual ingestion process."""
        self.print_header("Running Ingestion")

        # Confirm start
        if not self.confirm("Ready to start ingestion?"):
            self.print_info("Ingestion cancelled")
            return

        start_time = time.time()

        # For demo, we'll use the CSV connector as an example
        if self.manifest['name'] == 'csv-connector':
            from csv_connector.connector import CSVConnector

            manifest_path = self.connector_path / "manifest.yaml"
            connector = CSVConnector(str(manifest_path))

            self.print_info(f"Starting {self.manifest['name']}...")

            # Run connector
            results = connector.run()

            # Display results
            duration = time.time() - start_time

            self.print_success(f"Ingestion completed in {duration:.2f}s")
            print(f"\n{Colors.BOLD}Statistics:{Colors.END}")
            print(f"  Records processed: {results['stats']['records_processed']}")
            print(f"  Records succeeded: {results['stats']['records_succeeded']}")
            print(f"  Records failed: {results['stats']['records_failed']}")

            # PII report
            pii_report = results.get('pii_report', {})
            if pii_report.get('total_actions', 0) > 0:
                print(f"\n{Colors.YELLOW}PII Detections:{Colors.END}")
                print(f"  Total actions: {pii_report['total_actions']}")
                print(f"  Fields with PII: {', '.join(pii_report.get('fields_with_pii', []))}")

            # License report
            license_report = results.get('license_report', {})
            if license_report.get('total_violations', 0) > 0:
                print(f"\n{Colors.RED}License Violations:{Colors.END}")
                print(f"  Total violations: {license_report['total_violations']}")

            # Write lineage
            self._write_lineage(results)

        else:
            self.print_warning(f"Ingestion not yet implemented for {self.manifest['name']}")
            self.print_info("Use the connector's native implementation or implement connector.py")

    def _write_lineage(self, results: Dict[str, Any]):
        """Write lineage records to provenance system."""
        self.print_info("Recording lineage...")

        # Use the provenance system
        sys.path.insert(0, str(Path(__file__).parent.parent / "python"))

        try:
            from intelgraph_py.provenance.fabric_client import submit_receipt, generate_hash

            for result in results.get('results', []):
                lineage = result.get('lineage', {})

                # Create lineage record
                lineage_data = {
                    "connector": self.manifest['name'],
                    "timestamp": time.time(),
                    "source": lineage.get('source_system', 'unknown'),
                    "classification": lineage.get('data_classification', 'internal'),
                    "entities_count": len(result.get('entities', [])),
                }

                # Generate hash and submit receipt
                data_bytes = json.dumps(lineage_data, sort_keys=True).encode()
                data_hash = generate_hash(data_bytes)
                receipt = submit_receipt(data_hash, lineage_data)

                self.lineage_records.append({
                    "tx_id": receipt.tx_id,
                    "hash": data_hash,
                    "lineage": lineage_data,
                })

            self.print_success(f"Recorded {len(self.lineage_records)} lineage records")

        except Exception as e:
            self.print_warning(f"Could not record lineage: {e}")

    def show_summary(self):
        """Show final summary."""
        self.print_header("Summary")

        print(f"{Colors.BOLD}Connector:{Colors.END} {self.manifest['name']}")
        print(f"{Colors.BOLD}Version:{Colors.END} {self.manifest['version']}")
        print(f"{Colors.BOLD}Type:{Colors.END} {self.manifest.get('ingestion_type', 'unknown')}")

        if self.field_mappings:
            print(f"\n{Colors.BOLD}Field Mappings:{Colors.END} {len(self.field_mappings)} fields mapped")

        if self.pii_decisions:
            print(f"\n{Colors.BOLD}PII Decisions:{Colors.END}")
            for field, decision in self.pii_decisions.items():
                print(f"  {field}: {decision}")

        if self.lineage_records:
            print(f"\n{Colors.BOLD}Lineage:{Colors.END} {len(self.lineage_records)} records")
            print(f"  First TX ID: {self.lineage_records[0]['tx_id']}")

        print()

    def run(self):
        """Run the full wizard flow."""
        self.print_header("IntelGraph Ingestion Wizard")

        self.select_connector()
        self.validate_connector()
        self.propose_field_mappings()
        self.review_pii_flags()
        self.review_license_restrictions()
        self.run_ingestion()
        self.show_summary()

        self.print_success("Wizard complete!")


def main():
    """Main entry point."""
    try:
        wizard = IngestWizard()
        wizard.run()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Wizard interrupted by user{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n{Colors.RED}Error: {e}{Colors.END}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
