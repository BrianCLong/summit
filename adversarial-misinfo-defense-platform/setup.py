"""
Setup configuration for the Revolutionary Adversarial Misinformation Defense Platform

This package provides the most advanced and valuable innovations in misinformation defense:
- Cognitive dissonance modeling and analysis
- Quantum-inspired information analysis
- Neurosymbolic reasoning with artificial consciousness
- Temporal paradox resolution
- Quantum entropy optimization
- Fractal consciousness expansion
- Multi-dimensional integrated analysis
"""

import setuptools
import os


def get_long_description():
    """Get the long description from README.md"""
    readme_path = os.path.join(os.path.dirname(__file__), "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as fh:
            return fh.read()
    return "Revolutionary Adversarial Misinformation Defense Platform"


def get_requirements():
    """Get the required packages"""
    requirements = [
        "numpy>=1.21.0",
        "scipy>=1.7.0",
        "torch>=1.9.0",
        "transformers>=4.15.0",
        "opencv-python>=4.5.0",
        "librosa>=0.9.0",
        "pandas>=1.3.0",
        "scikit-learn>=1.0.0",
        "pyyaml>=6.0"
    ]
    return requirements


setuptools.setup(
    name="adversarial-misinfo-defense-platform",
    version="2.1.0",
    author="Summit Team",
    author_email="team@summit-platform.ai",
    description="Revolutionary Adversarial Misinformation Defense Platform with Cognitive, Quantum, and Consciousness Modeling",
    long_description=get_long_description(),
    long_description_content_type="text/markdown",
    url="https://github.com/BrianCLong/summit/tree/main/adversarial-misinfo-defense-platform",
    packages=setuptools.find_packages(include=["adversarial_misinfo_defense", "adversarial_misinfo_defense.*"]),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: Security :: Misinformation Defense",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=get_requirements(),
    entry_points={
        "console_scripts": [
            "amd-platform=adversarial_misinfo_defense.main:main",
        ],
    },
    include_package_data=True,
    package_data={
        "adversarial_misinfo_defense": ["*.md", "*.txt", "*.json", "web/**/*"],
    },
    keywords=[
        "misinformation", "adversarial", "defense", "AI", "security", 
        "quantum", "consciousness", "cognitive", "fractal", "temporal"
    ],
    project_urls={
        "Bug Reports": "https://github.com/BrianCLong/summit/issues",
        "Source": "https://github.com/BrianCLong/summit/tree/main/adversarial-misinfo-defense-platform",
        "Documentation": "https://github.com/BrianCLong/summit/blob/main/adversarial-misinfo-defense-platform/README.md",
    }
)