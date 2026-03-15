import json
import glob

def fix_pkg(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        data = json.loads(content)
        changed = False

        deps = data.get('dependencies', {})
        dev_deps = data.get('devDependencies', {})

        if 'react-native-keychain' in deps and deps['react-native-keychain'] == '9.0.3':
            deps['react-native-keychain'] = '^10.0.0'
            changed = True

        if 'react-native-safe-area-context' in deps and deps['react-native-safe-area-context'] == '5.1.7':
            deps['react-native-safe-area-context'] = '^5.7.0'
            changed = True

        if 'react-native-screens' in deps and deps['react-native-screens'] == '4.3.0':
            deps['react-native-screens'] = '^4.4.0'
            changed = True

        if '@types/express-session' in dev_deps and dev_deps['@types/express-session'] == '1.17.12':
            dev_deps['@types/express-session'] = '^1.18.2'
            changed = True

        if 'typescript' in dev_deps and dev_deps['typescript'] == '5.3.0':
            dev_deps['typescript'] = '^5.3.3'
            changed = True

        if changed:
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                f.write('\n')
            print(f"Fixed version in {filepath}")

    except Exception as e:
        pass

def main():
    for filepath in glob.glob('**/package.json', recursive=True):
        if 'node_modules' in filepath:
            continue
        fix_pkg(filepath)

if __name__ == '__main__':
    main()
