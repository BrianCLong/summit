"""
Setup script for Adversarial Misinformation Defense Platform

This script sets up the package for installation and distribution.
"""
from setuptools import setup, find_packages
from pathlib import Path


# Read the README file
README_PATH = Path(__file__).parent / "README.md"
LONG_DESCRIPTION = README_PATH.read_text(encoding="utf-8") if README_PATH.exists() else ""

# Read requirements
REQUIREMENTS_PATH = Path(__file__).parent / "requirements.txt"
REQUIREMENTS = []
if REQUIREMENTS_PATH.exists():
    REQUIREMENTS = REQUIREMENTS_PATH.read_text(encoding="utf-8").splitlines()
    REQUIREMENTS = [req.strip() for req in REQUIREMENTS if req.strip() and not req.startswith("#")]

setup(
    name="adversarial-misinfo-defense",
    version="1.0.0",
    author="Summit Team",
    author_email="summit-team@example.com",
    description="A comprehensive platform for detecting and defending against adversarial misinformation",
    long_description=LONG_DESCRIPTION,
    long_description_content_type="text/markdown",
    url="https://github.com/summit-team/adversarial-misinfo-defense",
    packages=find_packages(where="."),
    package_dir={"": "."},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Intended Audience :: Information Technology",
        "Topic :: Security",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=REQUIREMENTS,
    extras_require={
        "dev": [
            "black>=21.0",
            "flake8>=3.9.0",
            "mypy>=0.910",
            "pytest>=6.2.0",
            "pytest-cov>=2.12.0",
        ],
        "gpu": [
            "cudatoolkit>=11.1",
        ],
        "docs": [
            "sphinx>=4.0.0",
            "sphinx-rtd-theme>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "amd=adversarial_misinfo_defense.main:main",
            "amdp=adversarial_misinfo_defense.cli:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
)