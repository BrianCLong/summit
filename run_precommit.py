import urllib.request
import json
try:
    req = urllib.request.Request("http://127.0.0.1:2323", data=b"{}", headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
