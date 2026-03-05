with open('scripts/release/verify-release-bundle.mjs', 'r') as f:
    content = f.read()

replacement = """        } catch (e) {
            if (e instanceof SyntaxError) {
                addError('INVALID_JSON', `Failed to parse bundle-index.json: ${e.message}`);
            } else if (e instanceof ReleaseBundleError) {"""

content = content.replace("        } catch (e) {\n            if (e instanceof ReleaseBundleError) {", replacement)

with open('scripts/release/verify-release-bundle.mjs', 'w') as f:
    f.write(content)
