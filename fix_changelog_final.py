path = "CHANGELOG.md"
with open(path, "r") as f:
    lines = f.readlines()

new_lines = []
# We want to keep the header and [Unreleased]
# Then add our ONE entry.
# Then skip any existing duplicates of our entry.
# Then keep the rest.

header_found = False
unreleased_found = False
strategic_added = False

new_entry_lines = [
    "### Added\n",
    "- **Strategic Update**: Positioned Summit as the \"governed control plane\" for agent sprawl (vs. OpenAI Frontier).\n",
    "- **Context Receipts**: Added schema for governed context compaction (`schemas/context_receipt.v0.1.json`).\n",
    "- **Roadmap**: Updated roadmap with \"Context Receipts\", \"Multimodal Ingestion\", and \"Frontier Parity\".\n",
    "\n"
]

skip_until_next_section = False

for line in lines:
    if line.strip() == "## [Unreleased]":
        new_lines.append(line)
        unreleased_found = True
        # Add our entry immediately
        new_lines.extend(new_entry_lines)
        strategic_added = True
        continue

    if unreleased_found and not strategic_added:
        # This shouldn't happen with logic above
        pass

    # Detect if this line is part of a duplicate entry we want to remove
    if "**Strategic Update**" in line:
        skip_until_next_section = True
        # Remove the preceding "### Added" if it was just added?
        # This is tricky. Let's simpler: just filter out the specific lines we know are dupes.
        pass

    if "Added schema for governed context compaction" in line:
         continue

    if "**Strategic Update**" in line:
        continue

    if "**Roadmap**: Updated roadmap with" in line:
        continue

    # Also need to remove the "### Added" headers that might be left dangling if we remove the items?
    # Actually, the file has multiple "### Added" sections under [Unreleased] now due to my previous script.
    # Let's clean up by reading the whole [Unreleased] section and deduplicating.

    new_lines.append(line)

# This approach is getting messy.
# Better approach: Read the file, identify the [Unreleased] block, and rewrite it cleanly.
