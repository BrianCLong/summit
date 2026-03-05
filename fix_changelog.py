path = "CHANGELOG.md"
with open(path, "r") as f:
    lines = f.readlines()

new_lines = []
seen_strategic = False

for line in lines:
    # Remove duplicate Strategic Update entries
    if "**Strategic Update**" in line:
        if seen_strategic:
            continue # Skip duplicates
        seen_strategic = True

    # Remove the malformed line with empty ()
    if "Added schema for governed context compaction ()." in line:
        continue

    # Remove extra ### Added headers if they are consecutive or redundant?
    # This is harder to parse simply. I will just rely on manual verification or simpler cleanup.
    # Actually, let's just keep the file as is if it's "okay enough", but duplicate entries are bad.

    new_lines.append(line)

# This is too risky with simple logic. I will rewrite the file content manually since I know what it looks like.
