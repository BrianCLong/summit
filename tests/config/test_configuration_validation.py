"""
Configuration validation tests for Summit application
This addresses configuration management best practices
"""
import sys
import os
import json
import yaml
from pathlib import Path

def validate_environment_variables():
    """Validate that required environment variables are defined"""
    required_vars = [
        'NODE_ENV',
        'DATABASE_URL',
        'NEO4J_URI',
        'NEO4J_USER',
        'NEO4J_PASSWORD',
        'REDIS_URL',
        'JWT_SECRET',
        'SESSION_SECRET',
        'CONFIG_VALIDATE_ON_START',
        'HEALTH_ENDPOINTS_ENABLED'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️ Missing required environment variables: {missing_vars}")
        return False
    else:
        print("✅ All required environment variables are defined")
        return True

def validate_config_files():
    """Validate configuration files exist and are properly formatted"""
    config_paths = [
        'config/default.json',
        'config/production.json',
        '.env.example',
        'docker-compose.yml',
        'package.json'
    ]
    
    for config_path in config_paths:
        if os.path.exists(config_path):
            try:
                if config_path.endswith('.json'):
                    with open(config_path, 'r') as f:
                        json.load(f)
                elif config_path.endswith('.yml') or config_path.endswith('.yaml'):
                    with open(config_path, 'r') as f:
                        yaml.safe_load(f)
                print(f"✅ Configuration file {config_path} is valid")
            except Exception as e:
                print(f"❌ Configuration file {config_path} has errors: {e}")
                return False
        else:
            print(f"⚠️ Configuration file {config_path} not found")
    
    return True

def validate_dependencies():
    """Validate that dependencies are properly specified"""
    dependency_files = [
        'package.json',
        'requirements.txt',
        'requirements-security.txt',
        'pyproject.toml',
        'poetry.lock'
    ]
    
    found_package_json = False
    for dep_file in dependency_files:
        if os.path.exists(dep_file):
            print(f"✅ Dependency file {dep_file} exists")
            if dep_file == 'package.json':
                found_package_json = True
                
                # Validate package.json structure
                try:
                    with open(dep_file, 'r') as f:
                        data = json.load(f)
                    
                    # Check for security-relevant fields
                    if 'engines' in data:
                        print("✅ package.json specifies engine requirements")
                    if 'scripts' in data and 'test' in data['scripts']:
                        print("✅ package.json includes test scripts")
                    if 'dependencies' in data or 'devDependencies' in data:
                        print("✅ package.json includes dependency specifications")
                        
                except Exception as e:
                    print(f"❌ package.json validation error: {e}")
                    return False
    
    if not found_package_json:
        print("⚠️ package.json not found - this is typically required for Node.js projects")
    
    return True

def validate_schema_files():
    """Validate that schema files exist and are properly formatted"""
    schema_dir = 'summit/evidence/schemas/'
    if os.path.exists(schema_dir):
        schema_files = [f for f in os.listdir(schema_dir) if f.endswith('.schema.json')]
        
        for schema_file in schema_files:
            schema_path = os.path.join(schema_dir, schema_file)
            try:
                with open(schema_path, 'r') as f:
                    schema = json.load(f)
                
                # Basic validation: check if it has $schema or type field
                if '$schema' in schema or 'type' in schema:
                    print(f"✅ Schema file {schema_file} is valid")
                else:
                    print(f"⚠️ Schema file {schema_file} might be missing required fields")
                    
            except Exception as e:
                print(f"❌ Schema file {schema_file} has errors: {e}")
                return False
    else:
        print("⚠️ Schema directory not found")
    
    return True

def validate_prompt_registry():
    """Validate the prompt registry file"""
    registry_path = 'prompts/registry.yaml'
    if os.path.exists(registry_path):
        try:
            with open(registry_path, 'r') as f:
                registry = yaml.safe_load(f)
            
            if isinstance(registry, dict) and 'prompts' in registry:
                print("✅ Prompt registry is valid")
                return True
            else:
                print("⚠️ Prompt registry might have incorrect structure")
                return False
        except Exception as e:
            print(f"❌ Prompt registry validation error: {e}")
            return False
    else:
        print("⚠️ Prompt registry not found")
        return True  # Not critical for all installations

def run_all_validations():
    """Run all configuration validations"""
    print("Running configuration validations for Summit application...")
    print()
    
    results = []
    results.append(validate_environment_variables())
    results.append(validate_config_files())
    results.append(validate_dependencies())
    results.append(validate_schema_files())
    results.append(validate_prompt_registry())
    
    print()
    if all(results):
        print("✅ All configuration validations passed!")
        return True
    else:
        print("❌ Some configuration validations failed")
        return False

if __name__ == "__main__":
    run_all_validations()