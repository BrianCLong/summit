import subprocess
print('Pushing to remote...')
subprocess.run(['git', 'push', '-u', 'origin', 'feature/military-use-governance', '-f'])
