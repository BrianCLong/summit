#!/usr/bin/env python3
import sys, json, pathlib


def purge(tenant: str, subject: str):
  root = pathlib.Path('plugins_data') / tenant / subject
  removed = []
  if root.exists():
    for p in root.rglob('*'):
      if p.is_file():
        p.unlink()
        removed.append(str(p))
    for p in sorted(root.glob('**/*'), reverse=True):
      if p.is_dir():
        p.rmdir()
  print(json.dumps({"tenant": tenant, "subject": subject, "removed": removed}))


if __name__ == '__main__':
  if len(sys.argv) != 3:
    print('usage: dsar_purge_plugins.py <tenant> <subject>')
    sys.exit(1)
  purge(sys.argv[1], sys.argv[2])
