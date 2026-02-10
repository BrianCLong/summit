import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Matching pattern:
    #   if: false ...
    #   ...
    #   if: ...
    # Where ... does not contain 'jobs:' or '  \w+:' (new job start)
    # Actually, simpler: match 'if: false' then search for next 'if:' before next job start.
    
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith('if: false'):
            # Found a disabled job. Look ahead for another 'if:' before next job or end of file.
            found_second_if = -1
            for j in range(i + 1, min(i + 20, len(lines))):
                if re.match(r'^  \w+:', lines[j]): # New job start
                    break
                if lines[j].strip().startswith('if:'):
                    found_second_if = j
                    break
            
            if found_second_if != -1:
                # Merge them!
                first_val = line.split('if:')[1].strip()
                second_val = lines[found_second_if].split('if:')[1].strip()
                indent = line[:line.find('if:')]
                
                # Replace the line at found_second_if with merged
                lines[found_second_if] = f"{indent}if: ({first_val}) && ({second_val})"
                # Skip the current 'if: false' line
                i += 1
                continue
        
        new_lines.append(line)
        i += 1

    new_content = '\n'.join(new_lines)
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml'):
            fix_workflow(os.path.join(root, file))
