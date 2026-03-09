# File paths
pci_dss_path = "server/src/compliance/frameworks/PCIDSSControls.ts"

# Read file
with open(pci_dss_path) as f:
    content = f.read()

# Pattern to find createDataEnvelope(data, createVerdict(...))
# We want to replace it with createDataEnvelope(data, { source: 'PCIDSSControlsService', governanceVerdict: createVerdict(...) })

# We need to be careful about nested parentheses.
# The `createDataEnvelope` calls look like:
# return createDataEnvelope(
#   ...data...,
#   createVerdict(...)
# );

# A simple regex might fail if data spans multiple lines or has complex structure.
# But looking at the file, the data argument is often an object literal or a variable.
# The second argument is ALWAYS createVerdict(...).

# Let's try a regex that captures the arguments.
# Since we know the second argument starts with `createVerdict`, we can use that.

# Regex explanation:
# createDataEnvelope\(\s*  -> match function call start
# ([\s\S]+?),\s*           -> match first argument (lazy) as group 1
# (createVerdict\([\s\S]+?\))\s*\); -> match second arg (createVerdict call) as group 2.
# This assumes createVerdict(...) balances parens, which regex is bad at.
# However, if we assume the calls are well-formatted, maybe we can do it.

# Actually, the file content shows consistent formatting:
# return createDataEnvelope(
#   arg1,
#   createVerdict(...)
# );

# We can replace `,\s*createVerdict` with `, { source: 'PCIDSSControlsService', governanceVerdict: createVerdict`.
# And then we need to close the object brace before the closing paren of createDataEnvelope.
# That is the hard part - finding where to insert the `}`.

# Alternative: Replace `createDataEnvelope` with a wrapper helper locally defined in the file,
# and update the import?
# No, we must fix the calls to match the imported signature.

# Let's try a more robust parsing approach or manual replacement since there are only ~20 calls.
# Or use string replacement if the pattern is very consistent.

# The pattern `,[\s\n]*createVerdict\(` seems consistent.
# We can replace it with `, { source: 'PCIDSSControlsService', governanceVerdict: createVerdict(`.
# But we still need the closing `}`.

# Let's look at the end of the calls. They end with `\n    );\n` or `      )\n    );\n`.
# The `createVerdict` call ends with `)`.
# So the structure is `createDataEnvelope( arg1, createVerdict(...) )`.
# We want `createDataEnvelope( arg1, { source: '...', governanceVerdict: createVerdict(...) } )`.

# So we effectively want to wrap the second argument in `{ source: ..., governanceVerdict: ... }`.

# Let's iterate through the file line by line.
# If we see `createDataEnvelope(`, we note it.
# We look for the comma separating arg1 and arg2.
# Then we look for `createVerdict`.

modified_content = ""
lines = content.split("\n")
i = 0
while i < len(lines):
    line = lines[i]
    if "return createDataEnvelope(" in line:
        # found start.
        modified_content += line + "\n"
        i += 1
        # Now we are inside the call.
        # We need to find the comma that separates the first arg from `createVerdict`.
        # OR, simpler:
        # We search for the line containing `createVerdict(`.
        # We replace the preceding comma (or implied start of arg) with `{ source: 'PCIDSSControlsService', governanceVerdict: `.
        # And then we need to add `}` after the matching closing paren of `createVerdict`.

        # This is getting complicated to do robustly with simple string manipulation.

        # Let's look at the specific structure again.
        # Most calls are:
        # return createDataEnvelope(
        #   someData,
        #   createVerdict(
        #     ...
        #   )
        # );

        # The `createVerdict` is the LAST argument.
        # The closing `);` closes `createDataEnvelope`.

        # Strategy:
        # 1. Identify the line with `createVerdict(`.
        # 2. Prepend `{ source: 'PCIDSSControlsService', governanceVerdict: ` to `createVerdict(`.
        # 3. Track parenthesis depth to find where `createVerdict` ends.
        # 4. Append `}` after it ends.

        buffer = ""
        # We are inside createDataEnvelope.
        # consume lines until we find `createVerdict`
        while i < len(lines) and "createVerdict(" not in lines[i]:
            modified_content += lines[i] + "\n"
            i += 1

        if i < len(lines):
            # We found the line with `createVerdict(`.
            # It usually looks like `        createVerdict(` or `      createVerdict(`.
            # It might follow a comma from previous line.

            # Example:
            #     createVerdict(

            # We want:
            #     { source: 'PCIDSSControlsService', governanceVerdict: createVerdict(

            curr_line = lines[i]
            # Replace `createVerdict` with `{ source: 'PCIDSSControlsService', governanceVerdict: createVerdict`
            new_line = curr_line.replace(
                "createVerdict",
                "{ source: 'PCIDSSControlsService', governanceVerdict: createVerdict",
            )
            modified_content += new_line + "\n"
            i += 1

            # Now we need to find the closing paren for `createVerdict`.
            # We count open/close parens starting from `createVerdict(`.
            # Since we just added it, we know `createVerdict(` adds 1 open paren.
            # BUT `new_line` might have more parens.

            # Let's count parens in `new_line` AFTER `createVerdict`.
            # Actually, we can just count parens from the start of the `createVerdict` call.

            paren_balance = 0
            # Re-scan the lines we just processed? No, let's process forward.

            # We need to scan from the `createVerdict` we just modified.
            # But wait, `curr_line` might have had the comma?
            # Usually the comma is on the previous line after the first arg.
            # Or at the start of this line?

            # In the file `cat` output:
            # return createDataEnvelope(
            #   { flow: null, risks: [], recommendations: [] },
            #   createVerdict(

            # So `createVerdict` is at the start of the trimmed line.

            # We need to close the brace `}` after `createVerdict` finishes.
            # `createVerdict` usually spans multiple lines.

            # Logic to find closing paren of `createVerdict`:
            # We need to count parens starting from the `createVerdict` call.
            # We know `createVerdict` was in `curr_line`.
            # We count parens in `curr_line` starting from `createVerdict` index.

            # Wait, `createVerdict(` contributes +1.
            # We continue reading lines, updating balance.
            # When balance hits 0 (relative to start of `createVerdict`), we insert `}`.

            # Let's refine the loop.

            # We are currently just past `new_line` which contains `... createVerdict(`.
            # We need to track balance.

            # Let's parse `new_line` to initialize balance.
            # We only care about parens belonging to `createVerdict` args.
            # `createVerdict(` is open.

            start_index = new_line.find("createVerdict(")
            # count parens from there
            sub_str = new_line[start_index:]
            current_balance = sub_str.count("(") - sub_str.count(")")

            # If balance is 0, it closed on the same line.
            if current_balance == 0:
                # It closed on the same line.
                # We need to insert `}` after the closing paren.
                # But wait, there might be a trailing comma or `);`?
                # If `createDataEnvelope(..., createVerdict(...));`
                # Then `new_line` ends with `));` or `),`.

                # We need to be careful.
                # Let's just assume we append `}` after the matching paren.
                pass

            while current_balance > 0 and i < len(lines):
                line_content = lines[i]

                # Check for parens
                open_p = line_content.count("(")
                close_p = line_content.count(")")
                current_balance += open_p - close_p

                if current_balance <= 0:
                    # It closed on this line.
                    # We need to find WHERE it closed.
                    # This is tricky without character-by-character parsing.
                    # BUT, usually it is `      )` or `      ));` or `      ),`.

                    # If line is just `      )`, replace with `      })`?
                    # If line is `      ));`, replace with `      }));`?

                    # Let's look at the typical closing line in the file:
                    # `      )` (indentation varies)
                    # followed by `    );` on next line.

                    # So `line_content` is likely `      )`.
                    # We want to change it to `      })`.

                    # Let's just verify typical structure.
                    # createVerdict(
                    #   GovernanceResult.DENY,
                    #   'No CDE scope defined for tenant',
                    #   0.7
                    # )

                    # The closing paren is on its own line usually.
                    if line_content.strip() == ")":
                        modified_content += line_content.replace(")", "})") + "\n"
                    elif line_content.strip().startswith(")") and (
                        "," in line_content or ";" in line_content
                    ):
                        # e.g. `),` or `);`
                        # Replace first `)` with `})`
                        modified_content += line_content.replace(")", "})", 1) + "\n"
                    else:
                        # It might be `0.7)` -> `0.7})`
                        # Just replace the last `)` with `})`?
                        # Only if balance hits 0 exactly at the end?
                        # Safer: replace the `)` that brings balance to 0.
                        # Since we process line by line, if balance hits <= 0, we know the closing paren is in this line.
                        # We should find the N-th closing paren that closes the balance.

                        # Simplified assumption: append `}` after the closing paren.
                        # If `line_content` contains the closing paren, we append `}` after it.
                        # Since we are wrapping `createVerdict(...)` -> `{ ..., val: createVerdict(...) }`

                        # If the line has `... ) ...`, we want `... }) ...`.
                        modified_content += line_content.replace(")", "})", 1) + "\n"
                else:
                    modified_content += line_content + "\n"

                i += 1

    else:
        modified_content += line + "\n"
        i += 1

# Write back
with open(pci_dss_path, "w") as f:
    f.write(modified_content)

print("Fixed PCIDSSControls.ts")

# Now handle Middleware files
# adaptiveThrottlingMiddleware.ts and bulkheadMiddleware.ts
# They call `createDataEnvelope(result, { source: ... })` but `DataEnvelope` definition
# might imply `metadata` is not allowed in options OR they are accessing `.metadata` on the result.
# The error reported is "`metadata` property doesn't exist on `DataEnvelope<boolean>`".
# This usually means code is doing `envelope.metadata` but `DataEnvelope` interface doesn't have it.
# `DataEnvelope` has `provenance`, `data`, etc.
# In `base.ts`, `wrapEvent` adds `metadata`.
# But `DataEnvelope` type in `types/data-envelope.ts` has `provenance.metadata` inside `LineageNode`?
# Or maybe the middleware is trying to read `envelope.metadata` which was removed.
# Looking at grep:
# `const verdict = result.metadata?.governanceVerdict || ...`
# The `DataEnvelope` structure has `governanceVerdict` at the TOP LEVEL.
# So `result.metadata.governanceVerdict` is wrong. It should be `result.governanceVerdict`.

# We need to fix access patterns: `result.metadata?.governanceVerdict` -> `result.governanceVerdict`.

middleware_files = [
    "server/src/middleware/adaptiveThrottlingMiddleware.ts",
    "server/src/middleware/bulkheadMiddleware.ts",
]

for path in middleware_files:
    with open(path) as f:
        mw_content = f.read()

    # Replace `result.metadata?.governanceVerdict` with `result.governanceVerdict`
    # Also `result.metadata.governanceVerdict` just in case.
    mw_content = mw_content.replace(
        "result.metadata?.governanceVerdict", "result.governanceVerdict"
    )
    mw_content = mw_content.replace("result.metadata.governanceVerdict", "result.governanceVerdict")

    # Also check `acquired.metadata?.governanceVerdict` in `withBulkhead`
    mw_content = mw_content.replace(
        "acquired.metadata?.governanceVerdict", "acquired.governanceVerdict"
    )

    with open(path, "w") as f:
        f.write(mw_content)
    print(f"Fixed {path}")
