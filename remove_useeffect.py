file_path = 'apps/web/src/components/onboarding/OnboardingTour.tsx'

with open(file_path, 'r') as f:
    content = f.read()

start_marker = "useEffect(() => {"
start_pos = content.find(start_marker)

if start_pos != -1:
    # find matching brace
    stack = 0
    end_pos = -1
    for i in range(start_pos, len(content)):
        if content[i] == '{':
            stack += 1
        elif content[i] == '}':
            stack -= 1
            if stack == 0:
                # found end of function body
                # The useEffect call ends with `}, [])`
                # So we need to find `)` after this `}`
                end_pos = content.find(")", i) + 1
                break

    if end_pos != -1:
        # Remove it
        content = content[:start_pos] + content[end_pos:]

with open(file_path, 'w') as f:
    f.write(content)
