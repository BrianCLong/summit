import urllib.request
import json
import ssl

url = "https://api.github.com/repos/BrianCLong/summit/issues/17819/comments"

try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))

        if data:
            for comment in data:
                print(f"User: {comment['user']['login']}")
                print(f"Comment: {comment['body']}")
                print("-" * 20)
        else:
            print("No comments found.")
except Exception as e:
    print(f"Failed to fetch comments: {e}")
