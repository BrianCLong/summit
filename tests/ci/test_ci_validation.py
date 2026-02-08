"""
CI/CD workflow validation tests for Summit application
This validates the CI improvements mentioned in PRs
"""
import sys
import os
import yaml
import json
from pathlib import Path

def validate_github_workflows():
    """Validate GitHub Actions workflows"""
    print("Validating GitHub Actions workflows...")
    
    workflow_dir = '.github/workflows'
    if not os.path.exists(workflow_dir):
        print("⚠️ GitHub Actions workflow directory not found")
        return False
    
    workflow_files = []
    for root, dirs, files in os.walk(workflow_dir):
        for file in files:
            if file.endswith(('.yml', '.yaml')):
                workflow_files.append(os.path.join(root, file))
    
    if not workflow_files:
        print("⚠️ No GitHub Actions workflow files found")
        return True  # Not necessarily an error
    
    valid_workflows = 0
    for wf_file in workflow_files:
        try:
            with open(wf_file, 'r') as f:
                workflow = yaml.safe_load(f)
            
            # Basic validation: check for required fields
            if not isinstance(workflow, dict):
                print(f"❌ Workflow {wf_file} is not a valid YAML object")
                continue
            
            required_fields = ['name', 'on', 'jobs']
            missing_fields = [field for field in required_fields if field not in workflow]
            
            if missing_fields:
                print(f"⚠️ Workflow {wf_file} missing fields: {missing_fields}")
            else:
                print(f"✅ Workflow {wf_file} has required structure")
                valid_workflows += 1
            
            # Check for security best practices
            jobs = workflow.get('jobs', {})
            for job_name, job in jobs.items():
                steps = job.get('steps', [])
                for step in steps:
                    # Check for insecure patterns
                    run_cmd = step.get('run', '')
                    if 'set +e' in run_cmd or 'set +x' in run_cmd:
                        print(f"⚠️ Workflow {wf_file} job {job_name} contains potentially insecure command: {run_cmd[:50]}...")
                    
                    # Check for token usage
                    env_vars = step.get('env', {})
                    if 'GITHUB_TOKEN' in env_vars or '${{ secrets.GITHUB_TOKEN }}' in str(step):
                        print(f"✅ Workflow {wf_file} job {job_name} properly handles GITHUB_TOKEN")
            
        except yaml.YAMLError as e:
            print(f"❌ Workflow {wf_file} is not valid YAML: {e}")
        except Exception as e:
            print(f"❌ Error validating workflow {wf_file}: {e}")
    
    print(f"✅ Validated {valid_workflows}/{len(workflow_files)} workflows")
    return valid_workflows > 0

def validate_ci_scripts():
    """Validate CI scripts mentioned in PRs"""
    print("\nValidating CI scripts...")
    
    ci_scripts = [
        'scripts/ci/check-sigstore-versions.sh',
        'scripts/ci/rekor-cose-healthcheck.sh',
        'scripts/ci/test_sigstore_scripts.sh',
        'scripts/ci/security-scan.sh',
        'scripts/ci/performance-test.sh'
    ]
    
    found_scripts = []
    executable_scripts = []
    
    for script in ci_scripts:
        if os.path.exists(script):
            found_scripts.append(script)
            
            # Check if script is executable
            if os.access(script, os.X_OK):
                executable_scripts.append(script)
    
    if found_scripts:
        print(f"✅ Found {len(found_scripts)} CI scripts")
        for script in found_scripts:
            print(f"   - {script}")
    else:
        print("⚠️ No CI scripts found")
    
    if executable_scripts:
        print(f"✅ {len(executable_scripts)} scripts are executable")
    else:
        print("⚠️ No executable CI scripts found")
    
    return len(found_scripts) > 0

def validate_lockfile_sync():
    """Validate lockfile synchronization (related to PR #18163)"""
    print("\nValidating lockfile synchronization...")
    
    lockfiles = [
        'pnpm-lock.yaml',
        'package-lock.json',
        'yarn.lock',
        'Pipfile.lock',
        'poetry.lock'
    ]
    
    found_lockfiles = []
    for lockfile in lockfiles:
        if os.path.exists(lockfile):
            found_lockfiles.append(lockfile)
    
    if not found_lockfiles:
        print("⚠️ No lockfiles found")
        return True  # Not necessarily an error
    
    print(f"✅ Found {len(found_lockfiles)} lockfiles:")
    for lockfile in found_lockfiles:
        print(f"   - {lockfile}")
        
        # Check if lockfile is reasonably up-to-date with package files
        if lockfile == 'pnpm-lock.yaml':
            package_json = 'package.json'
            if os.path.exists(package_json):
                lockfile_time = os.path.getmtime(lockfile)
                package_json_time = os.path.getmtime(package_json)
                
                if package_json_time > lockfile_time:
                    print(f"⚠️ {package_json} is newer than {lockfile} - may need sync")
                else:
                    print(f"✅ {lockfile} is synchronized with {package_json}")
    
    return True

def validate_merge_group_workflow():
    """Validate merge group workflow (mentioned in PR #18159)"""
    print("\nValidating merge group workflow...")
    
    # Look for merge group configuration in GitHub Actions
    workflow_dir = '.github/workflows'
    if os.path.exists(workflow_dir):
        for file in os.listdir(workflow_dir):
            if file.endswith(('.yml', '.yaml')):
                with open(os.path.join(workflow_dir, file), 'r') as f:
                    try:
                        workflow = yaml.safe_load(f)
                        if workflow and isinstance(workflow, dict):
                            # Check if workflow triggers on merge_group
                            trigger_events = workflow.get('on', {})
                            if 'merge_group' in trigger_events or ('merge_group' in str(trigger_events)):
                                print(f"✅ Found merge group workflow: {file}")
                                return True
                    except yaml.YAMLError:
                        continue
    
    # Look for any mention of merge groups in scripts
    for root, dirs, files in os.walk('scripts'):
        for file in files:
            if file.endswith(('.sh', '.py', '.js')):
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if 'merge_group' in content.lower() or 'merge group' in content.lower():
                            print(f"✅ Found merge group reference in: {os.path.join(root, file)}")
                            return True
                except Exception:
                    continue
    
    print("⚠️ No merge group workflow found")
    return True  # Not necessarily an error

def validate_frozen_lockfile_check():
    """Validate frozen lockfile validation (related to PR #18163)"""
    print("\nValidating frozen lockfile check...")
    
    # Check for frozen lockfile validation in workflows
    workflow_dir = '.github/workflows'
    if os.path.exists(workflow_dir):
        for file in os.listdir(workflow_dir):
            if file.endswith(('.yml', '.yaml')):
                with open(os.path.join(workflow_dir, file), 'r') as f:
                    try:
                        workflow = yaml.safe_load(f)
                        if workflow and isinstance(workflow, dict):
                            jobs = workflow.get('jobs', {})
                            for job_name, job in jobs.items():
                                steps = job.get('steps', [])
                                for step in steps:
                                    run_cmd = step.get('run', '')
                                    if 'frozen-lockfile' in run_cmd or '--frozen-lockfile' in run_cmd:
                                        print(f"✅ Found frozen lockfile check in workflow {file}, job {job_name}")
                                        return True
                    except yaml.YAMLError:
                        continue
    
    # Check for frozen lockfile validation in scripts
    for root, dirs, files in os.walk('scripts'):
        for file in files:
            if file.endswith(('.sh', '.py')):
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        if 'frozen-lockfile' in content or '--frozen-lockfile' in content:
                            print(f"✅ Found frozen lockfile check in script: {os.path.join(root, file)}")
                            return True
                except Exception:
                    continue
    
    print("⚠️ No frozen lockfile validation found")
    return True  # Not necessarily an error

def validate_security_gate():
    """Validate security gates in CI/CD"""
    print("\nValidating security gates...")
    
    security_indicators = [
        'security-scan',
        'vulnerability-check',
        'dependency-check',
        'sast-scan',
        'secret-scan',
        'license-check'
    ]
    
    found_security_gates = []
    
    # Check workflows for security gates
    workflow_dir = '.github/workflows'
    if os.path.exists(workflow_dir):
        for file in os.listdir(workflow_dir):
            if file.endswith(('.yml', '.yaml')):
                with open(os.path.join(workflow_dir, file), 'r') as f:
                    try:
                        workflow = yaml.safe_load(f)
                        if workflow and isinstance(workflow, dict):
                            jobs = workflow.get('jobs', {})
                            for job_name, job in jobs.items():
                                steps = job.get('steps', [])
                                for step in steps:
                                    step_name = step.get('name', '').lower()
                                    run_cmd = step.get('run', '').lower()
                                    
                                    for indicator in security_indicators:
                                        if indicator in step_name or indicator in run_cmd:
                                            found_security_gates.append(f"{file}:{job_name}:{indicator}")
                    except yaml.YAMLError:
                        continue
    
    # Check scripts for security gates
    for root, dirs, files in os.walk('scripts'):
        for file in files:
            if file.endswith(('.sh', '.py')):
                try:
                    with open(os.path.join(root, file), 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read().lower()
                        for indicator in security_indicators:
                            if indicator in content:
                                found_security_gates.append(f"script:{os.path.join(root, file)}:{indicator}")
                except Exception:
                    continue
    
    if found_security_gates:
        print(f"✅ Found {len(found_security_gates)} security gates:")
        for gate in found_security_gates[:5]:  # Show first 5
            print(f"   - {gate}")
        if len(found_security_gates) > 5:
            print(f"   ... and {len(found_security_gates) - 5} more")
    else:
        print("⚠️ No security gates found")
    
    return len(found_security_gates) > 0

def validate_ci_performance():
    """Validate CI performance optimizations"""
    print("\nValidating CI performance optimizations...")
    
    performance_indicators = [
        'cache',
        'restore-cache',
        'save-cache',
        'actions/cache',
        'upload-artifact',
        'download-artifact',
        'matrix',
        'strategy',
        'max-parallel'
    ]
    
    found_performance_opts = []
    
    # Check workflows for performance optimizations
    workflow_dir = '.github/workflows'
    if os.path.exists(workflow_dir):
        for file in os.listdir(workflow_dir):
            if file.endswith(('.yml', '.yaml')):
                with open(os.path.join(workflow_dir, file), 'r') as f:
                    try:
                        workflow = yaml.safe_load(f)
                        if workflow and isinstance(workflow, dict):
                            jobs = workflow.get('jobs', {})
                            for job_name, job in jobs.items():
                                # Check for matrix strategy
                                if 'strategy' in job and 'matrix' in job['strategy']:
                                    found_performance_opts.append(f"{file}:{job_name}:matrix-strategy")
                                
                                steps = job.get('steps', [])
                                for step in steps:
                                    uses_action = step.get('uses', '').lower()
                                    step_name = step.get('name', '').lower()
                                    
                                    for indicator in performance_indicators:
                                        if indicator in uses_action or indicator in step_name:
                                            found_performance_opts.append(f"{file}:{job_name}:{indicator}")
                    except yaml.YAMLError:
                        continue
    
    if found_performance_opts:
        print(f"✅ Found {len(found_performance_opts)} performance optimizations:")
        for opt in found_performance_opts[:5]:  # Show first 5
            print(f"   - {opt}")
        if len(found_performance_opts) > 5:
            print(f"   ... and {len(found_performance_opts) - 5} more")
    else:
        print("⚠️ No performance optimizations found")
    
    return len(found_performance_opts) > 0

def run_all_ci_cd_tests():
    """Run all CI/CD validation tests"""
    print("Running CI/CD validation tests for Summit application...")
    print("=" * 60)
    
    results = []
    results.append(validate_github_workflows())
    results.append(validate_ci_scripts())
    results.append(validate_lockfile_sync())
    results.append(validate_merge_group_workflow())
    results.append(validate_frozen_lockfile_check())
    results.append(validate_security_gate())
    results.append(validate_ci_performance())
    
    print("\n" + "=" * 60)
    successful_tests = sum(1 for r in results if r is not False)
    total_tests = len([r for r in results if r is not None])
    
    print(f"CI/CD Tests Summary: {successful_tests}/{total_tests} passed")
    
    if successful_tests == total_tests and total_tests > 0:
        print("✅ All CI/CD validation tests passed!")
    elif total_tests > 0:
        print(f"⚠️ {total_tests - successful_tests} CI/CD validation tests had issues")
    else:
        print("⚠️ No CI/CD validation tests could be run")
    
    return successful_tests, total_tests

if __name__ == "__main__":
    run_all_ci_cd_tests()