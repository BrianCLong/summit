from setuptools import setup, find_packages

setup(
    name="promptpack_lint",
    version="0.1.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "jsonschema>=4.0.0",
        "pyyaml>=6.0",
        "click>=8.0.0",
    ],
    entry_points={
        "console_scripts": [
            "promptpack-lint=promptpack_lint.cli:main",
        ],
    },
)
