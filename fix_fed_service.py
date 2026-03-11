with open('server/src/federation/service.ts') as f:
    content = f.read()

# Make sure the new methods are inside the class
if "static exportToSTIX" in content:
    content = content.replace("}\n\n  static exportToSTIX", "\n  static exportToSTIX")
    content = content.replace("          }\n        ]\n      }\n    };\n  }", "          }\n        ]\n      }\n    };\n  }\n}")

with open('server/src/federation/service.ts', 'w') as f:
    f.write(content)
