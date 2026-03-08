import os


def get_cwd() -> str:
    """Returns the current working directory."""
    return os.getcwd()

def get_shell() -> str:
    """Returns the path to the current shell or default."""
    return os.environ.get("SHELL", "/bin/sh")
