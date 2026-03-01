import os
import subprocess
print('Pushing to remote...')
subprocess.run(['git', 'push', 'origin', 'HEAD:feature/military-use-governance', '-f'])
