import zipfile
import io
import os
import random

def create_dummy_zip(filename, content):
    """Creates a valid zip file in memory containing one file."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(filename, content)
    return buffer.getvalue()

def generate_malformed_zip(output_path, count=500):
    """
    Generates a malformed ZIP by concatenating multiple valid ZIP files.
    This mimics the GootLoader evasion technique described in Jan 2026.
    """
    print(f"Generating malformed ZIP with {count} concatenated archives...")

    with open(output_path, 'wb') as outfile:
        # Create the "real" payload that should be visible (conceptually)
        # In the attack, one of these is the malicious script.
        # We will make the *last* one the one that typically Windows Explorer might latch onto,
        # or the first one depending on how the parser works.
        # However, the technique describes simply gluing them together.

        for i in range(count):
            # Randomized content to evade hash detection
            dummy_content = f"This is dummy file #{i} " + str(random.random())
            zip_bytes = create_dummy_zip(f"payload_{i}.txt", dummy_content)

            # Write the raw zip bytes to the output file, effectively concatenating them
            outfile.write(zip_bytes)

            # Optionally add some garbage bytes between them or truncate metadata
            # The report mentions "Truncating and randomizing critical metadata"
            # We will simulate a simple concatenation first as that's the primary description.

    print(f"Successfully created {output_path} with size {os.path.getsize(output_path)} bytes.")

if __name__ == "__main__":
    generate_malformed_zip("gootloader_evasion_test.zip", count=500)
