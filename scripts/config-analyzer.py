#!/usr/bin/env python3
"""
Configuration Analysis Tool for Legacy Config Cleanup

This script analyzes configuration files and code to detect:
1. Config keys defined but never used in code
2. Config keys referenced in code but not defined
3. Duplicate config keys across files
4. Deprecated configuration patterns

Usage:
    python3 scripts/config-analyzer.py [--output report.json] [--format json|markdown|text]

Author: Claude Code
Date: 2025-11-20
"""

import os
import re
import json
import yaml
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, Set, List, Tuple
from dataclasses import dataclass, asdict

@dataclass
class ConfigKey:
    """Represents a configuration key with metadata"""
    name: str
    source_file: str
    line_number: int = 0
    value: str = ""

@dataclass
class ConfigAnalysisReport:
    """Complete analysis report"""
    unused_keys: List[Dict]
    missing_keys: List[Dict]
    duplicate_keys: List[Dict]
    deprecated_patterns: List[Dict]
    config_sources: List[str]
    code_files_scanned: int
    total_defined_keys: int
    total_used_keys: int
    recommendations: List[str]

class ConfigAnalyzer:
    """Analyzes configuration across the codebase"""

    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.defined_keys: Dict[str, List[ConfigKey]] = defaultdict(list)
        self.used_keys: Dict[str, List[Tuple[str, int]]] = defaultdict(list)
        self.deprecated_vars = {
            'NEO4J_USERNAME': 'NEO4J_USER',
        }

        # Patterns to detect config usage in code
        self.usage_patterns = [
            r'process\.env\.([A-Z_][A-Z0-9_]*)',  # process.env.KEY_NAME
            r'process\.env\[(["\'])([A-Z_][A-Z0-9_]*)\1\]',  # process.env["KEY_NAME"]
            r'z\.string\(\)\.parse\(process\.env\.([A-Z_][A-Z0-9_]*)',  # Zod parsing
            r'(?:cfg|config)\.([a-zA-Z_][a-zA-Z0-9_]*)',  # cfg.keyName
        ]

        # Files/directories to ignore
        self.ignore_patterns = {
            'node_modules', '.git', 'dist', 'build', '.next',
            'coverage', '.pnpm-store', 'pnpm-lock.yaml',
            '*.min.js', '*.map', '*.log'
        }

    def should_ignore(self, path: Path) -> bool:
        """Check if path should be ignored"""
        path_str = str(path)
        for pattern in self.ignore_patterns:
            if pattern in path_str:
                return True
        return False

    def scan_env_file(self, file_path: Path):
        """Extract keys from .env files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    # Skip comments and empty lines
                    if not line or line.startswith('#'):
                        continue
                    # Match KEY=value pattern
                    match = re.match(r'^([A-Z_][A-Z0-9_]*)=(.*)$', line)
                    if match:
                        key_name = match.group(1)
                        value = match.group(2)
                        self.defined_keys[key_name].append(
                            ConfigKey(key_name, str(file_path), line_num, value)
                        )
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")

    def scan_yaml_file(self, file_path: Path):
        """Extract keys from YAML config files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                if data:
                    self._extract_yaml_keys(data, str(file_path), prefix="")
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")

    def _extract_yaml_keys(self, data, file_path: str, prefix: str):
        """Recursively extract keys from YAML structure"""
        if isinstance(data, dict):
            for key, value in data.items():
                full_key = f"{prefix}{key}".upper().replace('.', '_')
                self.defined_keys[full_key].append(
                    ConfigKey(full_key, file_path, 0, str(value) if not isinstance(value, (dict, list)) else "")
                )
                if isinstance(value, dict):
                    self._extract_yaml_keys(value, file_path, f"{prefix}{key}.")

    def scan_json_file(self, file_path: Path):
        """Extract keys from JSON config files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data:
                    self._extract_json_keys(data, str(file_path), prefix="")
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")

    def _extract_json_keys(self, data, file_path: str, prefix: str):
        """Recursively extract keys from JSON structure"""
        if isinstance(data, dict):
            for key, value in data.items():
                full_key = f"{prefix}{key}".upper().replace('.', '_')
                self.defined_keys[full_key].append(
                    ConfigKey(full_key, file_path, 0, str(value) if not isinstance(value, (dict, list)) else "")
                )
                if isinstance(value, dict):
                    self._extract_json_keys(value, file_path, f"{prefix}{key}.")

    def scan_typescript_config(self, file_path: Path):
        """Extract Zod schema keys and process.env usage from TypeScript config files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

                # Extract Zod schema definitions
                # Pattern: KEY_NAME: z.string() or KEY_NAME: z.coerce.number()
                zod_pattern = r'^\s*([A-Z_][A-Z0-9_]*)\s*:\s*z\.'
                for line_num, line in enumerate(content.split('\n'), 1):
                    match = re.match(zod_pattern, line)
                    if match:
                        key_name = match.group(1)
                        self.defined_keys[key_name].append(
                            ConfigKey(key_name, str(file_path), line_num, "zod-schema")
                        )
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")

    def scan_code_for_usage(self, file_path: Path):
        """Scan code files for configuration usage"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

                for line_num, line in enumerate(content.split('\n'), 1):
                    for pattern in self.usage_patterns:
                        matches = re.finditer(pattern, line)
                        for match in matches:
                            # Extract the key name from the match groups
                            if len(match.groups()) >= 2:
                                key_name = match.group(2)  # For quoted patterns
                            else:
                                key_name = match.group(1)  # For simple patterns

                            # Only track uppercase environment variable style keys
                            if key_name and key_name.isupper() and '_' in key_name:
                                self.used_keys[key_name].append((str(file_path), line_num))
        except Exception as e:
            # Skip binary files or files that can't be read
            pass

    def scan_all_configs(self):
        """Scan all configuration files in the repository"""
        print("📂 Scanning configuration files...")

        config_patterns = [
            ('**/.env*', self.scan_env_file),
            ('**/*.yaml', self.scan_yaml_file),
            ('**/*.yml', self.scan_yaml_file),
            ('config/**/*.json', self.scan_json_file),
        ]

        for pattern, scanner_func in config_patterns:
            for file_path in self.root_dir.glob(pattern):
                if not self.should_ignore(file_path) and file_path.is_file():
                    # Skip .example files for now (they're templates)
                    if '.example' not in str(file_path):
                        print(f"  ✓ {file_path.relative_to(self.root_dir)}")
                        scanner_func(file_path)

        # Scan TypeScript config files specifically
        for file_path in self.root_dir.glob('**/config.ts'):
            if not self.should_ignore(file_path):
                print(f"  ✓ {file_path.relative_to(self.root_dir)}")
                self.scan_typescript_config(file_path)

        for file_path in self.root_dir.glob('**/src/config/*.ts'):
            if not self.should_ignore(file_path):
                print(f"  ✓ {file_path.relative_to(self.root_dir)}")
                self.scan_typescript_config(file_path)

    def scan_all_code(self):
        """Scan all code files for configuration usage"""
        print("\n🔍 Scanning code files for config usage...")

        code_extensions = ['*.ts', '*.tsx', '*.js', '*.jsx']
        file_count = 0

        for ext in code_extensions:
            for file_path in self.root_dir.glob(f'**/{ext}'):
                if not self.should_ignore(file_path) and file_path.is_file():
                    self.scan_code_for_usage(file_path)
                    file_count += 1

        print(f"  ✓ Scanned {file_count} code files")
        return file_count

    def detect_deprecated_patterns(self) -> List[Dict]:
        """Detect usage of deprecated configuration patterns"""
        deprecated = []

        for old_key, new_key in self.deprecated_vars.items():
            if old_key in self.used_keys:
                for file_path, line_num in self.used_keys[old_key]:
                    deprecated.append({
                        'old_key': old_key,
                        'new_key': new_key,
                        'file': file_path,
                        'line': line_num,
                        'action': f"Replace '{old_key}' with '{new_key}'"
                    })

        # Detect duplicate config files
        config_files = defaultdict(list)
        for file_path in self.root_dir.glob('**/config.*'):
            if not self.should_ignore(file_path):
                base_name = file_path.stem
                config_files[base_name].append(str(file_path))

        for base_name, files in config_files.items():
            if len(files) > 1:
                deprecated.append({
                    'pattern': 'duplicate_config_files',
                    'files': files,
                    'action': f"Consolidate {len(files)} config files with base name '{base_name}'"
                })

        return deprecated

    def analyze(self) -> ConfigAnalysisReport:
        """Perform complete analysis and generate report"""
        self.scan_all_configs()
        code_files = self.scan_all_code()

        print("\n📊 Analyzing results...")

        # Find unused keys (defined but never used)
        unused_keys = []
        for key_name, definitions in self.defined_keys.items():
            if key_name not in self.used_keys:
                for defn in definitions:
                    unused_keys.append({
                        'key': key_name,
                        'defined_in': defn.source_file,
                        'line': defn.line_number,
                        'value': defn.value[:50] + '...' if len(defn.value) > 50 else defn.value
                    })

        # Find missing keys (used but never defined)
        missing_keys = []
        for key_name, usages in self.used_keys.items():
            if key_name not in self.defined_keys:
                for file_path, line_num in usages[:5]:  # Limit to first 5 usages
                    missing_keys.append({
                        'key': key_name,
                        'used_in': file_path,
                        'line': line_num,
                    })

        # Find duplicate keys (defined in multiple places)
        duplicate_keys = []
        for key_name, definitions in self.defined_keys.items():
            if len(definitions) > 1:
                duplicate_keys.append({
                    'key': key_name,
                    'count': len(definitions),
                    'locations': [
                        {'file': d.source_file, 'line': d.line_number, 'value': d.value[:30]}
                        for d in definitions
                    ]
                })

        # Detect deprecated patterns
        deprecated_patterns = self.detect_deprecated_patterns()

        # Generate recommendations
        recommendations = self._generate_recommendations(
            len(unused_keys), len(missing_keys), len(duplicate_keys), len(deprecated_patterns)
        )

        return ConfigAnalysisReport(
            unused_keys=unused_keys,
            missing_keys=missing_keys,
            duplicate_keys=duplicate_keys,
            deprecated_patterns=deprecated_patterns,
            config_sources=list(set(d.source_file for defs in self.defined_keys.values() for d in defs)),
            code_files_scanned=code_files,
            total_defined_keys=len(self.defined_keys),
            total_used_keys=len(self.used_keys),
            recommendations=recommendations
        )

    def _generate_recommendations(self, unused_count, missing_count,
                                  duplicate_count, deprecated_count) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if unused_count > 0:
            recommendations.append(
                f"⚠️  Found {unused_count} unused config keys. Consider removing them to reduce confusion."
            )

        if missing_count > 0:
            recommendations.append(
                f"🚨 Found {missing_count} missing config keys. Add these to .env.example with documentation."
            )

        if duplicate_count > 10:
            recommendations.append(
                f"⚠️  Found {duplicate_count} duplicate config keys across files. Consolidate to single source of truth."
            )

        if deprecated_count > 0:
            recommendations.append(
                f"🔄 Found {deprecated_count} deprecated patterns. Follow migration guide to modernize."
            )

        # Always include general recommendations
        recommendations.extend([
            "✅ Consolidate config loading: Choose ONE approach (recommended: Zod-based validation in server/src/config.ts)",
            "✅ Remove duplicate config files: Delete legacy .js versions, keep only .ts",
            "✅ Standardize validation: Use Zod throughout for type safety and runtime validation",
            "✅ Document .env precedence: Create clear documentation of config file loading order",
        ])

        return recommendations

def format_report_text(report: ConfigAnalysisReport) -> str:
    """Format report as readable text"""
    output = []
    output.append("=" * 80)
    output.append("🔧 CONFIGURATION ANALYSIS REPORT")
    output.append("=" * 80)
    output.append("")

    output.append("📈 SUMMARY")
    output.append("-" * 80)
    output.append(f"Config sources scanned:     {len(report.config_sources)}")
    output.append(f"Code files scanned:         {report.code_files_scanned}")
    output.append(f"Total defined keys:         {report.total_defined_keys}")
    output.append(f"Total used keys:            {report.total_used_keys}")
    output.append(f"Unused keys:                {len(report.unused_keys)}")
    output.append(f"Missing keys:               {len(report.missing_keys)}")
    output.append(f"Duplicate keys:             {len(report.duplicate_keys)}")
    output.append(f"Deprecated patterns:        {len(report.deprecated_patterns)}")
    output.append("")

    if report.unused_keys:
        output.append("🗑️  UNUSED KEYS (Defined but never used)")
        output.append("-" * 80)
        for item in report.unused_keys[:20]:  # Show first 20
            output.append(f"  • {item['key']}")
            output.append(f"    Defined in: {item['defined_in']}:{item['line']}")
            if item['value']:
                output.append(f"    Value: {item['value']}")
        if len(report.unused_keys) > 20:
            output.append(f"  ... and {len(report.unused_keys) - 20} more")
        output.append("")

    if report.missing_keys:
        output.append("🚨 MISSING KEYS (Used but not defined)")
        output.append("-" * 80)
        # Group by key
        missing_by_key = defaultdict(list)
        for item in report.missing_keys:
            missing_by_key[item['key']].append(item)

        for key, usages in list(missing_by_key.items())[:20]:
            output.append(f"  • {key}")
            for usage in usages[:3]:  # Show first 3 usages
                output.append(f"    Used in: {usage['used_in']}:{usage['line']}")
        if len(missing_by_key) > 20:
            output.append(f"  ... and {len(missing_by_key) - 20} more keys")
        output.append("")

    if report.duplicate_keys:
        output.append("⚠️  DUPLICATE KEYS (Defined in multiple places)")
        output.append("-" * 80)
        for item in report.duplicate_keys[:15]:  # Show first 15
            output.append(f"  • {item['key']} ({item['count']} definitions)")
            for loc in item['locations']:
                output.append(f"    - {loc['file']}:{loc['line']}")
        if len(report.duplicate_keys) > 15:
            output.append(f"  ... and {len(report.duplicate_keys) - 15} more")
        output.append("")

    if report.deprecated_patterns:
        output.append("🔄 DEPRECATED PATTERNS")
        output.append("-" * 80)
        for item in report.deprecated_patterns[:10]:
            if 'old_key' in item:
                output.append(f"  • {item['old_key']} → {item['new_key']}")
                output.append(f"    Found in: {item['file']}:{item['line']}")
                output.append(f"    Action: {item['action']}")
            elif 'pattern' in item:
                output.append(f"  • {item['pattern']}")
                output.append(f"    Action: {item['action']}")
                for f in item.get('files', [])[:3]:
                    output.append(f"      - {f}")
        output.append("")

    output.append("💡 RECOMMENDATIONS")
    output.append("-" * 80)
    for rec in report.recommendations:
        output.append(f"  {rec}")
    output.append("")

    output.append("=" * 80)
    output.append("Report generated: 2025-11-20")
    output.append("=" * 80)

    return "\n".join(output)

def format_report_markdown(report: ConfigAnalysisReport) -> str:
    """Format report as Markdown"""
    output = []
    output.append("# 🔧 Configuration Analysis Report\n")
    output.append("## 📈 Summary\n")
    output.append(f"- **Config sources scanned:** {len(report.config_sources)}")
    output.append(f"- **Code files scanned:** {report.code_files_scanned}")
    output.append(f"- **Total defined keys:** {report.total_defined_keys}")
    output.append(f"- **Total used keys:** {report.total_used_keys}")
    output.append(f"- **Unused keys:** {len(report.unused_keys)}")
    output.append(f"- **Missing keys:** {len(report.missing_keys)}")
    output.append(f"- **Duplicate keys:** {len(report.duplicate_keys)}")
    output.append(f"- **Deprecated patterns:** {len(report.deprecated_patterns)}\n")

    if report.unused_keys:
        output.append("## 🗑️ Unused Keys (Defined but never used)\n")
        for item in report.unused_keys[:20]:
            output.append(f"- **{item['key']}**")
            output.append(f"  - Defined in: `{item['defined_in']}:{item['line']}`")
            if item['value']:
                output.append(f"  - Value: `{item['value']}`")
        if len(report.unused_keys) > 20:
            output.append(f"\n*... and {len(report.unused_keys) - 20} more*\n")

    if report.missing_keys:
        output.append("\n## 🚨 Missing Keys (Used but not defined)\n")
        missing_by_key = defaultdict(list)
        for item in report.missing_keys:
            missing_by_key[item['key']].append(item)

        for key, usages in list(missing_by_key.items())[:20]:
            output.append(f"- **{key}**")
            for usage in usages[:3]:
                output.append(f"  - Used in: `{usage['used_in']}:{usage['line']}`")
        if len(missing_by_key) > 20:
            output.append(f"\n*... and {len(missing_by_key) - 20} more keys*\n")

    if report.duplicate_keys:
        output.append("\n## ⚠️ Duplicate Keys (Defined in multiple places)\n")
        for item in report.duplicate_keys[:15]:
            output.append(f"- **{item['key']}** ({item['count']} definitions)")
            for loc in item['locations']:
                output.append(f"  - `{loc['file']}:{loc['line']}`")
        if len(report.duplicate_keys) > 15:
            output.append(f"\n*... and {len(report.duplicate_keys) - 15} more*\n")

    if report.deprecated_patterns:
        output.append("\n## 🔄 Deprecated Patterns\n")
        for item in report.deprecated_patterns[:10]:
            if 'old_key' in item:
                output.append(f"- **{item['old_key']}** → **{item['new_key']}**")
                output.append(f"  - Found in: `{item['file']}:{item['line']}`")
                output.append(f"  - Action: {item['action']}")
            elif 'pattern' in item:
                output.append(f"- **{item['pattern']}**")
                output.append(f"  - Action: {item['action']}")

    output.append("\n## 💡 Recommendations\n")
    for rec in report.recommendations:
        output.append(f"- {rec}")

    output.append(f"\n---\n*Report generated: 2025-11-20*")

    return "\n".join(output)

def main():
    parser = argparse.ArgumentParser(
        description='Analyze configuration files for unused, missing, and duplicate keys'
    )
    parser.add_argument(
        '--root',
        default='.',
        help='Root directory of the project (default: current directory)'
    )
    parser.add_argument(
        '--output',
        default='config-analysis-report.txt',
        help='Output file path (default: config-analysis-report.txt)'
    )
    parser.add_argument(
        '--format',
        choices=['text', 'markdown', 'json'],
        default='text',
        help='Output format (default: text)'
    )

    args = parser.parse_args()

    print("🚀 Starting configuration analysis...")
    print(f"📂 Root directory: {os.path.abspath(args.root)}\n")

    analyzer = ConfigAnalyzer(args.root)
    report = analyzer.analyze()

    # Format output
    if args.format == 'json':
        output_content = json.dumps(asdict(report), indent=2)
    elif args.format == 'markdown':
        output_content = format_report_markdown(report)
    else:  # text
        output_content = format_report_text(report)

    # Write to file
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(output_content)

    print(f"\n✅ Analysis complete! Report saved to: {args.output}")

    # Print summary to console
    print("\n" + "=" * 80)
    print("📊 QUICK SUMMARY")
    print("=" * 80)
    print(f"Unused keys:     {len(report.unused_keys)}")
    print(f"Missing keys:    {len(report.missing_keys)}")
    print(f"Duplicate keys:  {len(report.duplicate_keys)}")
    print(f"Deprecated:      {len(report.deprecated_patterns)}")
    print("=" * 80)

if __name__ == '__main__':
    main()
