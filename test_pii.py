import re

email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
with open("server/src/app.ts") as f:
    text = f.read()

matches = re.finditer(email_pattern, text)
for m in matches:
    print(m.group())
