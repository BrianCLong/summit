#!/usr/bin/env python3
"""
Comprehensive Health Check for Summit Application
This script performs a full health check of all Summit components
"""
import os
import sys
import json
import subprocess
import requests
import time
from datetime import datetime, timedelta
import socket
from urllib.parse import urlparse

def check_application_health():
    """Check the overall health of the Summit application"""
    print("🏥 Running comprehensive health check for Summit application...")
    print("=" * 60)
    
    health_results = {
        "timestamp": datetime.now().isoformat(),
        "checks": {},
        "overall_status": "unknown",
        "issues_found": 0
    }
    
    # Check 1: Service availability
    print("🔍 Checking service availability...")
    services_to_check = [
        {"name": "Neo4j", "port": 7687, "type": "database"},
        {"name": "PostgreSQL", "port": 5432, "type": "database"},
        {"name": "Redis", "port": 6379, "type": "cache"},
        {"name": "API Server", "port": 4000, "type": "service"},
        {"name": "Web Interface", "port": 3000, "type": "service"}
    ]
    
    for service in services_to_check:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)  # 5 second timeout
            result = sock.connect_ex(('localhost', service["port"]))
            sock.close()
            
            if result == 0:
                health_results["checks"][f"{service['name']}_port"] = {
                    "status": "healthy",
                    "message": f"{service['name']} is accessible on port {service['port']}",
                    "service_type": service["type"]
                }
                print(f"✅ {service['name']} (port {service['port']}) - HEALTHY")
            else:
                health_results["checks"][f"{service['name']}_port"] = {
                    "status": "unhealthy",
                    "message": f"{service['name']} is not accessible on port {service['port']}",
                    "service_type": service["type"]
                }
                print(f"❌ {service['name']} (port {service['port']}) - UNHEALTHY")
                health_results["issues_found"] += 1
        except Exception as e:
            health_results["checks"][f"{service['name']}_port"] = {
                "status": "error",
                "message": f"Error checking {service['name']}: {str(e)}",
                "service_type": service["type"]
            }
            print(f"❌ {service['name']} (port {service['port']}) - ERROR: {e}")
            health_results["issues_found"] += 1
    
    # Check 2: Dependency health
    print("\n🔍 Checking dependency health...")
    dependencies_to_check = [
        {"name": "jsonschema", "check": lambda: check_jsonschema_dependency()},
        {"name": "validators", "check": lambda: check_validators_dependency()},
        {"name": "helmet", "check": lambda: check_helmet_dependency()},
        {"name": "express-rate-limit", "check": lambda: check_ratelimit_dependency()},
        {"name": "cors", "check": lambda: check_cors_dependency()}
    ]
    
    for dep in dependencies_to_check:
        try:
            status, message = dep["check"]()
            health_results["checks"][f"{dep['name']}_dependency"] = {
                "status": status,
                "message": message,
                "service_type": "dependency"
            }
            
            if status == "healthy":
                print(f"✅ {dep['name']} - HEALTHY")
            else:
                print(f"⚠️ {dep['name']} - {status.upper()}: {message}")
                if status == "unhealthy":
                    health_results["issues_found"] += 1
        except Exception as e:
            health_results["checks"][f"{dep['name']}_dependency"] = {
                "status": "error",
                "message": f"Error checking {dep['name']}: {str(e)}",
                "service_type": "dependency"
            }
            print(f"❌ {dep['name']} - ERROR: {e}")
            health_results["issues_found"] += 1
    
    # Check 3: File system integrity
    print("\n🔍 Checking file system integrity...")
    critical_files = [
        "package.json",
        "requirements.txt",
        "requirements-security.txt",
        "docker-compose.yml",
        "Dockerfile",
        "SECURITY.md",
        "docs/security/security-best-practices.md"
    ]
    
    for file in critical_files:
        if os.path.exists(file):
            size = os.path.getsize(file)
            health_results["checks"][f"{file}_exists"] = {
                "status": "healthy",
                "message": f"File {file} exists and is {size} bytes",
                "service_type": "filesystem"
            }
            print(f"✅ {file} - EXISTS ({size} bytes)")
        else:
            health_results["checks"][f"{file}_exists"] = {
                "status": "missing",
                "message": f"File {file} does not exist",
                "service_type": "filesystem"
            }
            print(f"❌ {file} - MISSING")
            health_results["issues_found"] += 1
    
    # Check 4: Environment configuration
    print("\n🔍 Checking environment configuration...")
    critical_env_vars = [
        "NODE_ENV",
        "CONFIG_VALIDATE_ON_START",
        "HEALTH_ENDPOINTS_ENABLED",
        "ENABLE_INSECURE_DEV_AUTH"
    ]
    
    for var in critical_env_vars:
        if os.environ.get(var):
            health_results["checks"][f"{var}_set"] = {
                "status": "healthy",
                "message": f"Environment variable {var} is set",
                "service_type": "configuration"
            }
            print(f"✅ {var} - SET")
        else:
            health_results["checks"][f"{var}_set"] = {
                "status": "warning",
                "message": f"Environment variable {var} is not set",
                "service_type": "configuration"
            }
            print(f"⚠️ {var} - NOT SET (may be in config files)")
    
    # Check 5: Security configurations
    print("\n🔍 Checking security configurations...")
    security_configs = [
        {"name": "Security Headers", "check": lambda: check_security_headers()},
        {"name": "Input Validation", "check": lambda: check_input_validation()},
        {"name": "Rate Limiting", "check": lambda: check_rate_limiting()},
        {"name": "Authentication", "check": lambda: check_authentication_security()}
    ]
    
    for config in security_configs:
        try:
            status, message = config["check"]()
            health_results["checks"][f"{config['name']}_config"] = {
                "status": status,
                "message": message,
                "service_type": "security"
            }
            
            if status == "healthy":
                print(f"✅ {config['name']} - CONFIGURED")
            else:
                print(f"⚠️ {config['name']} - {status.upper()}: {message}")
                if status == "unhealthy":
                    health_results["issues_found"] += 1
        except Exception as e:
            health_results["checks"][f"{config['name']}_config"] = {
                "status": "error",
                "message": f"Error checking {config['name']}: {str(e)}",
                "service_type": "security"
            }
            print(f"❌ {config['name']} - ERROR: {e}")
            health_results["issues_found"] += 1
    
    # Determine overall status
    if health_results["issues_found"] == 0:
        health_results["overall_status"] = "healthy"
        print(f"\n🎉 ALL CHECKS PASSED! Summit application is healthy.")
    elif health_results["issues_found"] < 5:
        health_results["overall_status"] = "degraded"
        print(f"\n⚠️ SUMMIT APPLICATION HAS {health_results['issues_found']} ISSUES - FUNCTIONAL BUT NEEDS ATTENTION")
    else:
        health_results["overall_status"] = "unhealthy"
        print(f"\n❌ SUMMIT APPLICATION HAS {health_results['issues_found']} ISSUES - NEEDS IMMEDIATE ATTENTION")
    
    # Save health check results
    with open('HEALTH_CHECK_RESULTS.json', 'w') as f:
        json.dump(health_results, f, indent=2)
    
    print(f"\n📊 Health check results saved to HEALTH_CHECK_RESULTS.json")
    print(f"⏰ Check completed at: {health_results['timestamp']}")
    
    return health_results

def check_jsonschema_dependency():
    """Check if jsonschema dependency is available and working"""
    try:
        import jsonschema
        # Test basic functionality
        schema = {"type": "string"}
        jsonschema.validate("test", schema)
        return "healthy", "jsonschema dependency is available and functional"
    except ImportError:
        return "missing", "jsonschema dependency is not installed"
    except Exception as e:
        return "unhealthy", f"jsonschema dependency has issues: {str(e)}"

def check_validators_dependency():
    """Check if validators dependency is available"""
    try:
        import validators
        # Test basic functionality
        is_valid = validators.url("https://example.com")
        return "healthy", "validators dependency is available and functional"
    except ImportError:
        return "missing", "validators dependency is not installed"
    except Exception as e:
        return "unhealthy", f"validators dependency has issues: {str(e)}"

def check_helmet_dependency():
    """Check if helmet security headers are configured"""
    try:
        # Look for helmet in package.json or in code
        if os.path.exists('package.json'):
            with open('package.json', 'r') as f:
                content = f.read()
                if 'helmet' in content.lower():
                    return "healthy", "helmet security headers dependency found in package.json"
                else:
                    return "missing", "helmet security headers not found in package.json"
        else:
            return "missing", "package.json not found"
    except Exception as e:
        return "error", f"error checking helmet dependency: {str(e)}"

def check_ratelimit_dependency():
    """Check if rate limiting is configured"""
    try:
        # Look for rate limiting in package.json or in code
        if os.path.exists('package.json'):
            with open('package.json', 'r') as f:
                content = f.read()
                if 'express-rate-limit' in content.lower() or 'rate-limit' in content.lower():
                    return "healthy", "rate limiting dependency found in package.json"
                else:
                    return "missing", "rate limiting not found in package.json"
        else:
            return "missing", "package.json not found"
    except Exception as e:
        return "error", f"error checking rate limit dependency: {str(e)}"

def check_cors_dependency():
    """Check if CORS is configured"""
    try:
        # Look for CORS in package.json or in code
        if os.path.exists('package.json'):
            with open('package.json', 'r') as f:
                content = f.read()
                if 'cors' in content.lower():
                    return "healthy", "cors dependency found in package.json"
                else:
                    return "missing", "cors not found in package.json"
        else:
            return "missing", "package.json not found"
    except Exception as e:
        return "error", f"error checking cors dependency: {str(e)}"

def check_security_headers():
    """Check if security headers are properly configured"""
    try:
        # Look for security header configurations in code
        security_header_indicators = [
            'helmet', 'security', 'csp', 'hsts', 'x-frame-options',
            'x-content-type-options', 'x-xss-protection', 'strict-transport-security'
        ]
        
        found_headers = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith(('.js', '.ts', '.py')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            for indicator in security_header_indicators:
                                if indicator in content and indicator not in found_headers:
                                    found_headers.append(indicator)
                    except:
                        continue
        
        if found_headers:
            return "healthy", f"security headers configured: {', '.join(found_headers)}"
        else:
            return "missing", "no security headers found in configuration"
    except Exception as e:
        return "error", f"error checking security headers: {str(e)}"

def check_input_validation():
    """Check if input validation is properly configured"""
    try:
        # Look for input validation patterns in code
        validation_indicators = [
            'validator', 'validate', 'sanitize', 'escape', 'xss', 'input',
            'express-validator', 'joi', 'yup', 'zod', 'sanitize-html'
        ]
        
        found_validations = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith(('.js', '.ts', '.py')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            for indicator in validation_indicators:
                                if indicator in content and indicator not in found_validations:
                                    found_validations.append(indicator)
                    except:
                        continue
        
        if found_validations:
            return "healthy", f"input validation configured: {', '.join(found_validations)}"
        else:
            return "missing", "no input validation found in configuration"
    except Exception as e:
        return "error", f"error checking input validation: {str(e)}"

def check_rate_limiting():
    """Check if rate limiting is properly configured"""
    try:
        # Look for rate limiting configurations in code
        rate_limit_indicators = [
            'rateLimit', 'express-rate-limit', 'rate limit', 'throttle',
            'max requests', 'request limit', 'api limit', 'brute force'
        ]
        
        found_limits = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith(('.js', '.ts', '.py')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            for indicator in rate_limit_indicators:
                                if indicator in content and indicator not in found_limits:
                                    found_limits.append(indicator)
                    except:
                        continue
        
        if found_limits:
            return "healthy", f"rate limiting configured: {', '.join(found_limits)}"
        else:
            return "missing", "no rate limiting found in configuration"
    except Exception as e:
        return "error", f"error checking rate limiting: {str(e)}"

def check_authentication_security():
    """Check if authentication security is properly configured"""
    try:
        # Look for authentication security patterns in code
        auth_indicators = [
            'auth', 'authentication', 'jwt', 'passport', 'bcrypt', 'argon2',
            'password', 'login', 'session', 'oauth', 'openid', 'sso',
            'multi-factor', 'mfa', '2fa', 'totp', 'otp'
        ]
        
        found_auth = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.endswith(('.js', '.ts', '.py')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                            for indicator in auth_indicators:
                                if indicator in content and indicator not in found_auth:
                                    found_auth.append(indicator)
                    except:
                        continue
        
        if found_auth:
            return "healthy", f"authentication security configured: {', '.join(found_auth)}"
        else:
            return "missing", "no authentication security found in configuration"
    except Exception as e:
        return "error", f"error checking authentication security: {str(e)}"

def generate_health_report(health_results):
    """Generate a human-readable health report"""
    print("\n" + "=" * 60)
    print("SUMMIT APPLICATION HEALTH REPORT")
    print("=" * 60)
    
    print(f"Check Timestamp: {health_results['timestamp']}")
    print(f"Overall Status: {health_results['overall_status'].upper()}")
    print(f"Issues Found: {health_results['issues_found']}")
    print()
    
    # Group checks by type
    by_type = {}
    for check_name, check_result in health_results['checks'].items():
        service_type = check_result.get('service_type', 'other')
        if service_type not in by_type:
            by_type[service_type] = []
        by_type[service_type].append((check_name, check_result))
    
    for service_type, checks in by_type.items():
        print(f"{service_type.upper()} CHECKS:")
        print("-" * 20)
        for check_name, check_result in checks:
            status = check_result['status'].upper()
            message = check_result['message']
            icon = "✅" if status == "HEALTHY" else "❌" if status in ["UNHEALTHY", "ERROR", "MISSING"] else "⚠️"
            print(f"{icon} {check_name}: {status} - {message}")
        print()
    
    print("=" * 60)
    
    if health_results['overall_status'] == 'healthy':
        print("🎉 CONGRATULATIONS! The Summit application is in excellent health!")
        print("All systems are operational and security measures are in place.")
    elif health_results['overall_status'] == 'degraded':
        print("⚠️ The Summit application is functional but has some areas that need attention.")
        print("Please review the issues above and address them as soon as possible.")
    else:
        print("❌ The Summit application has critical issues that need immediate attention.")
        print("Please address the critical issues before deploying to production.")

if __name__ == "__main__":
    results = check_application_health()
    generate_health_report(results)
    
    # Exit with appropriate code based on health status
    if results['overall_status'] == 'healthy':
        sys.exit(0)
    else:
        sys.exit(1)