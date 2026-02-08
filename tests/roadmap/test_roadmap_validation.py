"""
Roadmap and status tracking tests for Summit application
This validates the roadmap status updates mentioned in various PRs
"""
import sys
import os
import json
import yaml
from datetime import datetime

def validate_roadmap_status():
    """Validate the roadmap status file structure and content"""
    print("Validating roadmap status file...")
    
    roadmap_path = 'docs/roadmap/STATUS.json'
    
    if not os.path.exists(roadmap_path):
        print("⚠️ Roadmap status file not found")
        return False
    
    try:
        with open(roadmap_path, 'r') as f:
            roadmap_data = json.load(f)
        
        # Validate basic structure
        required_fields = ['last_updated', 'status_items', 'version']
        missing_fields = [field for field in required_fields if field not in roadmap_data]
        
        if missing_fields:
            print(f"❌ Roadmap status file missing required fields: {missing_fields}")
            return False
        
        print("✅ Roadmap status file has required structure")
        
        # Validate status items
        status_items = roadmap_data.get('status_items', [])
        if not status_items:
            print("⚠️ Roadmap status file has no status items")
            return True  # Not necessarily an error
        
        valid_statuses = ['planned', 'in_progress', 'completed', 'on_hold', 'cancelled']
        valid_categories = ['feature', 'bug', 'enhancement', 'security', 'documentation', 'infrastructure']
        
        for i, item in enumerate(status_items):
            if not isinstance(item, dict):
                print(f"❌ Status item #{i} is not a dictionary")
                continue
            
            item_required = ['id', 'title', 'status', 'category']
            item_missing = [field for field in item_required if field not in item]
            
            if item_missing:
                print(f"❌ Status item #{i} missing required fields: {item_missing}")
                continue
            
            # Validate status value
            if item['status'] not in valid_statuses:
                print(f"⚠️ Status item '{item['title']}' has invalid status: {item['status']}")
            
            # Validate category value
            if item['category'] not in valid_categories:
                print(f"⚠️ Status item '{item['title']}' has invalid category: {item['category']}")
        
        print(f"✅ Roadmap status file validated with {len(status_items)} items")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Roadmap status file is not valid JSON: {e}")
        return False
    except Exception as e:
        print(f"❌ Error validating roadmap status file: {e}")
        return False

def validate_repo_assumptions():
    """Validate the repository assumptions file"""
    print("\nValidating repository assumptions file...")
    
    assumptions_path = 'repo_assumptions.md'
    
    if not os.path.exists(assumptions_path):
        print("⚠️ Repository assumptions file not found")
        return False
    
    try:
        with open(assumptions_path, 'r') as f:
            content = f.read()
        
        # Look for key sections that should be in assumptions
        required_sections = [
            'architecture', 'dependencies', 'deployment', 
            'security', 'performance', 'scalability'
        ]
        
        found_sections = []
        content_lower = content.lower()
        for section in required_sections:
            if section in content_lower:
                found_sections.append(section)
        
        if found_sections:
            print(f"✅ Repository assumptions file contains {len(found_sections)} of {len(required_sections)} expected sections")
            print(f"   Found: {', '.join(found_sections)}")
        else:
            print("⚠️ Repository assumptions file may be missing key sections")
        
        return True
        
    except Exception as e:
        print(f"❌ Error validating repository assumptions: {e}")
        return False

def validate_prompt_registry():
    """Validate the prompt registry file"""
    print("\nValidating prompt registry...")
    
    registry_path = 'prompts/registry.yaml'
    
    if not os.path.exists(registry_path):
        print("⚠️ Prompt registry file not found")
        return False
    
    try:
        with open(registry_path, 'r') as f:
            registry_data = yaml.safe_load(f)
        
        if not isinstance(registry_data, dict):
            print("❌ Prompt registry is not a valid dictionary")
            return False
        
        if 'prompts' not in registry_data:
            print("❌ Prompt registry missing 'prompts' key")
            return False
        
        prompts = registry_data['prompts']
        if not isinstance(prompts, list):
            print("❌ Prompts section is not a list")
            return False
        
        for i, prompt in enumerate(prompts):
            if not isinstance(prompt, dict):
                print(f"❌ Prompt #{i} is not a dictionary")
                continue
            
            required_prompt_fields = ['id', 'name', 'version', 'description']
            missing_fields = [field for field in required_prompt_fields if field not in prompt]
            
            if missing_fields:
                print(f"❌ Prompt #{i} missing required fields: {missing_fields}")
                continue
            
            # Validate version format
            version = prompt.get('version', '')
            if not version.startswith('v') or not any(c.isdigit() for c in version):
                print(f"⚠️ Prompt '{prompt['name']}' has unusual version format: {version}")
        
        print(f"✅ Prompt registry validated with {len(prompts)} prompts")
        return True
        
    except yaml.YAMLError as e:
        print(f"❌ Prompt registry is not valid YAML: {e}")
        return False
    except Exception as e:
        print(f"❌ Error validating prompt registry: {e}")
        return False

def validate_documentation_links():
    """Validate that documentation links are valid"""
    print("\nValidating documentation links...")
    
    docs_dir = 'docs'
    if not os.path.exists(docs_dir):
        print("⚠️ Documentation directory not found")
        return False
    
    # Find all markdown files in docs
    md_files = []
    for root, dirs, files in os.walk(docs_dir):
        for file in files:
            if file.endswith('.md'):
                md_files.append(os.path.join(root, file))
    
    broken_links = []
    total_links = 0
    
    for md_file in md_files:
        try:
            with open(md_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Find markdown links: [text](link)
            import re
            links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
            
            for link_text, link_url in links:
                total_links += 1
                
                # Check if it's an external link or internal reference
                if link_url.startswith(('http://', 'https://', 'mailto:', '#')):
                    continue  # External links and anchors are OK
                
                # Check if internal file exists
                link_path = os.path.join(os.path.dirname(md_file), link_url)
                
                # Handle relative paths
                if not os.path.isabs(link_path):
                    link_path = os.path.abspath(link_path)
                
                # Normalize the path
                link_path = os.path.normpath(link_path)
                
                # Check if file exists
                if not os.path.exists(link_path):
                    broken_links.append((md_file, link_url, link_text))
        
        except Exception as e:
            print(f"⚠️ Could not validate links in {md_file}: {e}")
    
    if broken_links:
        print(f"❌ Found {len(broken_links)} broken links out of {total_links} total links")
        for source_file, link_url, link_text in broken_links[:5]:  # Show first 5
            print(f"   - {source_file}: [{link_text}]({link_url})")
        if len(broken_links) > 5:
            print(f"   ... and {len(broken_links) - 5} more")
    else:
        print(f"✅ All {total_links} documentation links are valid")
    
    return len(broken_links) == 0

def validate_standards_documentation():
    """Validate standards documentation files"""
    print("\nValidating standards documentation...")
    
    standards_dir = 'docs/standards'
    if not os.path.exists(standards_dir):
        print("⚠️ Standards documentation directory not found")
        return False
    
    standards_files = []
    for root, dirs, files in os.walk(standards_dir):
        for file in files:
            if file.endswith('.md'):
                standards_files.append(os.path.join(root, file))
    
    if not standards_files:
        print("⚠️ No standards documentation files found")
        return True  # Not necessarily an error
    
    print(f"✅ Found {len(standards_files)} standards documentation files")
    
    # Check for recent standards files (mentioned in PRs)
    recent_standards = [
        'luspo-length-unbiased-spo.md',
        'security-standards.md',
        'coding-standards.md'
    ]
    
    found_recent = []
    for standard in recent_standards:
        standard_path = os.path.join(standards_dir, standard)
        if os.path.exists(standard_path):
            found_recent.append(standard)
    
    if found_recent:
        print(f"✅ Found recent standards: {', '.join(found_recent)}")
    
    return True

def validate_security_documentation():
    """Validate security documentation"""
    print("\nValidating security documentation...")
    
    security_docs = [
        'docs/security/',
        'docs/security/data-handling/',
        'docs/security/threat-model.md',
        'docs/security/security-best-practices.md'
    ]
    
    found_docs = []
    for doc_path in security_docs:
        if os.path.exists(doc_path):
            found_docs.append(doc_path)
    
    if found_docs:
        print(f"✅ Found {len(found_docs)} security documentation components")
        return True
    else:
        print("⚠️ No security documentation found")
        return False

def run_all_roadmap_tests():
    """Run all roadmap and documentation validation tests"""
    print("Running roadmap and documentation validation tests...")
    print("=" * 60)
    
    results = []
    results.append(validate_roadmap_status())
    results.append(validate_repo_assumptions())
    results.append(validate_prompt_registry())
    results.append(validate_documentation_links())
    results.append(validate_standards_documentation())
    results.append(validate_security_documentation())
    
    print("\n" + "=" * 60)
    successful_tests = sum(1 for r in results if r is not False)
    total_tests = len([r for r in results if r is not None])
    
    print(f"Roadmap/Documentation Tests Summary: {successful_tests}/{total_tests} passed")
    
    if successful_tests == total_tests and total_tests > 0:
        print("✅ All roadmap/documentation tests passed!")
    elif total_tests > 0:
        print(f"⚠️ {total_tests - successful_tests} roadmap/documentation tests had issues")
    else:
        print("⚠️ No roadmap/documentation tests could be run")
    
    return successful_tests, total_tests

if __name__ == "__main__":
    run_all_roadmap_tests()