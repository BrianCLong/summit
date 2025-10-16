from setuptools import find_packages, setup

with open("README.md", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="adversarial-misinfo-defense",
    version="1.0.0",
    author="Summit Team",
    author_email="summit-team@example.com",
    description="A comprehensive platform for detecting and defending against adversarial misinformation",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/summit-team/adversarial-misinfo-defense",
    packages=find_packages(),
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
    ],
    python_requires=">=3.8",
    install_requires=requirements,
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
    },
    entry_points={
        "console_scripts": [
            "amdp-validate=adversarial_misinfo_defense.cli:validate",
            "amdp-train=adversarial_misinfo_defense.cli:train",
            "amdp-exercise=adversarial_misinfo_defense.cli:exercise",
        ],
    },
)
