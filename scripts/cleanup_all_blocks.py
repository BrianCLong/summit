import sys
import re

def cleanup(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    cleaned_lines = []
    in_merge_conflict = False
    keep_next = False

    for line in lines:
        if line.startswith('<<<<<<< HEAD'):
            in_merge_conflict = True
            keep_next = True
            continue
        elif line.startswith('======='):
            keep_next = False
            continue
        elif line.startswith('>>>>>>>'):
            in_merge_conflict = False
            continue

        if not in_merge_conflict or keep_next:
            cleaned_lines.append(line)

    with open(file_path, 'w') as f:
        f.writelines(cleaned_lines)

if __name__ == '__main__':
    for path in sys.argv[1:]:
        cleanup(path)
