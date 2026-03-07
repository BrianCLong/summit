filepath = "apps/web/vite.config.ts"
with open(filepath) as f:
    content = f.read()

# Add proxy
if "proxy: {" not in content:
    content = content.replace(
        "server: {",
        "server: {\n    proxy: {\n      '/api/rag': {\n        target: 'http://localhost:8001',\n        changeOrigin: true,\n        rewrite: (path) => path.replace(/^\/api\/rag/, '')\n      },\n      '/api/graphrag': {\n        target: 'http://localhost:8002',\n        changeOrigin: true,\n        rewrite: (path) => path.replace(/^\/api\/graphrag/, '')\n      }\n    },"
    )
    print("Added proxy to vite.config.ts")
else:
    print("Proxy already exists in vite.config.ts")

with open(filepath, "w") as f:
    f.write(content)
