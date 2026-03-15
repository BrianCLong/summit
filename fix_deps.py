import os
import json

def fix_file(file_path):
    with open(file_path, 'r') as f:
        content = json.load(f)

    changed = False
    if 'devDependencies' in content:
        if 'typescript' in content['devDependencies'] and content['devDependencies']['typescript'] == '5.0.0':
            content['devDependencies']['typescript'] = '5.0.2'
            changed = True

    if changed:
        with open(file_path, 'w') as f:
            json.dump(content, f, indent=2)
        print(f"Fixed typescript version in {file_path}")

def find_package_jsons(dir_path):
    for root, dirs, files in os.walk(dir_path):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if 'dist' in dirs:
            dirs.remove('dist')
        if '.git' in dirs:
            dirs.remove('.git')
        for file in files:
            if file == 'package.json':
                yield os.path.join(root, file)

if __name__ == '__main__':
    for pkg in find_package_jsons('.'):
        fix_file(pkg)
