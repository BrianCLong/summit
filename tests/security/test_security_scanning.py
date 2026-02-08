"""
Security scanner tests for Summit application
This addresses security scanning recommendations
"""
import sys
import os
import subprocess
import tempfile
from pathlib import Path

def test_dependency_vulnerability_scan():
    """Test dependency vulnerability scanning"""
    print("Testing dependency vulnerability scanning...")
    
    # Check for common vulnerability scanners
    scanners_found = []
    
    # Check for npm audit (if package.json exists)
    if os.path.exists('package.json'):
        try:
            result = subprocess.run(['npm', 'audit', '--audit-level=high'], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0 or 'found 0 vulnerabilities' in result.stdout:
                print("✅ npm audit available and no critical vulnerabilities found")
                scanners_found.append('npm-audit')
            else:
                print(f"⚠️ npm audit found vulnerabilities or had issues")
        except FileNotFoundError:
            print("⚠️ npm not available for dependency scanning")
        except subprocess.TimeoutExpired:
            print("⚠️ npm audit timed out")
    
    # Check for pip-audit (Python dependency scanning)
    try:
        result = subprocess.run(['pip-audit', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ pip-audit available for Python dependency scanning")
            scanners_found.append('pip-audit')
    except FileNotFoundError:
        print("⚠️ pip-audit not available for Python dependency scanning")
    except subprocess.TimeoutExpired:
        print("⚠️ pip-audit version check timed out")
    
    # Check for other common scanners
    common_scanners = ['snyk', 'trivy', 'grype', 'clair', 'osv-scanner']
    for scanner in common_scanners:
        try:
            result = subprocess.run([scanner, '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"✅ {scanner} available for security scanning")
                scanners_found.append(scanner)
        except FileNotFoundError:
            print(f"⚠️ {scanner} not available for security scanning")
        except subprocess.TimeoutExpired:
            print(f"⚠️ {scanner} version check timed out")
    
    if not scanners_found:
        print("⚠️ No security scanners detected - consider adding dependency vulnerability scanning to CI/CD")
    else:
        print(f"✅ Found security scanners: {', '.join(scanners_found)}")
    
    return scanners_found

def test_static_analysis_tools():
    """Test static analysis security tools"""
    print("\nTesting static analysis security tools...")
    
    tools_found = []
    
    # Check for ESLint (JavaScript/TypeScript security rules)
    if os.path.exists('package.json') or os.path.exists('.eslintrc.js') or os.path.exists('.eslintrc.json'):
        try:
            result = subprocess.run(['eslint', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print("✅ ESLint available for JavaScript/TypeScript security analysis")
                tools_found.append('eslint')
        except FileNotFoundError:
            print("⚠️ ESLint not available for JavaScript/TypeScript analysis")
        except subprocess.TimeoutExpired:
            print("⚠️ ESLint version check timed out")
    
    # Check for Bandit (Python security linter)
    try:
        result = subprocess.run(['bandit', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Bandit available for Python security analysis")
            tools_found.append('bandit')
    except FileNotFoundError:
        print("⚠️ Bandit not available for Python security analysis")
    except subprocess.TimeoutExpired:
        print("⚠️ Bandit version check timed out")
    
    # Check for Semgrep
    try:
        result = subprocess.run(['semgrep', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Semgrep available for multi-language security analysis")
            tools_found.append('semgrep')
    except FileNotFoundError:
        print("⚠️ Semgrep not available for security analysis")
    except subprocess.TimeoutExpired:
        print("⚠️ Semgrep version check timed out")
    
    # Check for SonarQube Scanner
    try:
        result = subprocess.run(['sonar-scanner', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ SonarQube Scanner available for comprehensive analysis")
            tools_found.append('sonar-scanner')
    except FileNotFoundError:
        print("⚠️ SonarQube Scanner not available")
    except subprocess.TimeoutExpired:
        print("⚠️ SonarQube Scanner version check timed out")
    
    if not tools_found:
        print("⚠️ No static analysis tools detected - consider adding security-focused linters to CI/CD")
    else:
        print(f"✅ Found static analysis tools: {', '.join(tools_found)}")
    
    return tools_found

def test_secret_scanning():
    """Test secret scanning capabilities"""
    print("\nTesting secret scanning capabilities...")
    
    tools_found = []
    
    # Check for TruffleHog
    try:
        result = subprocess.run(['trufflehog', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ TruffleHog available for secret scanning")
            tools_found.append('trufflehog')
    except FileNotFoundError:
        print("⚠️ TruffleHog not available for secret scanning")
    except subprocess.TimeoutExpired:
        print("⚠️ TruffleHog version check timed out")
    
    # Check for Gitleaks
    try:
        result = subprocess.run(['gitleaks', 'version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Gitleaks available for secret scanning")
            tools_found.append('gitleaks')
    except FileNotFoundError:
        print("⚠️ Gitleaks not available for secret scanning")
    except subprocess.TimeoutExpired:
        print("⚠️ Gitleaks version check timed out")
    
    # Check for Detect-secrets
    try:
        result = subprocess.run(['detect-secrets', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ detect-secrets available for secret scanning")
            tools_found.append('detect-secrets')
    except FileNotFoundError:
        print("⚠️ detect-secrets not available for secret scanning")
    except subprocess.TimeoutExpired:
        print("⚠️ detect-secrets version check timed out")
    
    if not tools_found:
        print("⚠️ No secret scanning tools detected - consider adding to prevent credential leaks")
    else:
        print(f"✅ Found secret scanning tools: {', '.join(tools_found)}")
    
    return tools_found

def test_security_headers():
    """Test for security header configurations"""
    print("\nTesting security header configurations...")
    
    # Check for security middleware configurations
    config_files = [
        'server.js',
        'app.js',
        'src/server.js',
        'src/app.js',
        'package.json',
        'webpack.config.js',
        'nginx.conf',
        '.htaccess'
    ]
    
    security_headers_found = []
    
    for config_file in config_files:
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().lower()
                    
                    # Check for common security headers
                    if 'helmet' in content:
                        security_headers_found.append('Helmet.js')
                    if 'hsts' in content or 'strict-transport-security' in content:
                        security_headers_found.append('HSTS')
                    if 'x-frame-options' in content or 'frameguard' in content:
                        security_headers_found.append('X-Frame-Options')
                    if 'x-content-type-options' in content or 'nosniff' in content:
                        security_headers_found.append('X-Content-Type-Options')
                    if 'x-xss-protection' in content or 'xss' in content:
                        security_headers_found.append('X-XSS-Protection')
                    if 'content-security-policy' in content or 'csp' in content:
                        security_headers_found.append('CSP')
                        
            except Exception as e:
                print(f"⚠️ Could not read {config_file}: {e}")
    
    if security_headers_found:
        print(f"✅ Found security header implementations: {', '.join(set(security_headers_found))}")
    else:
        print("⚠️ No security headers detected in configuration files")
    
    return security_headers_found

def test_input_validation_patterns():
    """Test for input validation patterns"""
    print("\nTesting input validation patterns...")
    
    validation_indicators = []
    
    # Look for common validation patterns in source files
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith(('.js', '.ts', '.py', '.java', '.go', '.rb')):
                filepath = os.path.join(root, file)
                
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read().lower()
                        
                        # Check for validation libraries/functions
                        if 'joi' in content or 'celebrate' in content:  # Joi validation
                            validation_indicators.append('Joi validation')
                        if 'zod' in content:  # Zod validation
                            validation_indicators.append('Zod validation')
                        if 'yup' in content:  # Yup validation
                            validation_indicators.append('Yup validation')
                        if 'validator' in content and ('isvalid' in content or 'validate' in content):
                            validation_indicators.append('Custom validation')
                        if 'sanitize' in content or 'sanitizer' in content:
                            validation_indicators.append('Input sanitization')
                        if 'escape' in content and ('html' in content or 'xss' in content):
                            validation_indicators.append('XSS protection')
                            
                except Exception:
                    continue  # Skip files that can't be read
    
    if validation_indicators:
        unique_validations = list(set(validation_indicators))
        print(f"✅ Found input validation implementations: {', '.join(unique_validations[:5])}")  # Limit output
        if len(unique_validations) > 5:
            print(f"   (and {len(unique_validations) - 5} more validation patterns)")
    else:
        print("⚠️ No clear input validation patterns detected")
    
    return validation_indicators

def run_all_security_tests():
    """Run all security scanning tests"""
    print("Running security scanning tests for Summit application...")
    print("=" * 60)
    
    dependency_scanners = test_dependency_vulnerability_scan()
    static_analysis_tools = test_static_analysis_tools()
    secret_scanners = test_secret_scanning()
    security_headers = test_security_headers()
    input_validation = test_input_validation_patterns()
    
    print("\n" + "=" * 60)
    print("Security Scanning Summary:")
    print(f"  Dependency Scanners: {len(dependency_scanners)} found")
    print(f"  Static Analysis Tools: {len(static_analysis_tools)} found") 
    print(f"  Secret Scanners: {len(secret_scanners)} found")
    print(f"  Security Headers: {len(security_headers)} found")
    print(f"  Input Validation: {len(input_validation)} patterns found")
    
    total_tools = len(dependency_scanners) + len(static_analysis_tools) + len(secret_scanners)
    if total_tools >= 3:
        print("\n✅ Good security tooling coverage detected!")
    elif total_tools >= 1:
        print("\n⚠️ Some security tooling detected, consider adding more tools")
    else:
        print("\n❌ No security tools detected - strongly recommend adding security scanning to CI/CD")
    
    print("\n💡 Recommendations:")
    print("   - Add dependency vulnerability scanning to CI/CD")
    print("   - Implement static analysis security scanning")
    print("   - Add secret scanning to prevent credential leaks")
    print("   - Configure security headers for web applications")
    print("   - Implement comprehensive input validation")

if __name__ == "__main__":
    run_all_security_tests()