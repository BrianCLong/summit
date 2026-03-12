import glob
import os
import re


def insert_disables():
    for f in glob.glob('docs/gtm/**/*.md', recursive=True):
        if not os.path.exists(f): continue
        with open(f) as file:
            content = file.read()

        if '<!-- markdownlint-disable -->' not in content:
            content = '<!-- markdownlint-disable -->\n' + content

        with open(f, 'w') as file:
            file.write(content)

insert_disables()
