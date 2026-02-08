from safety.sandbox.runner import file_delete, file_write, load_policy
def delete(path: str, approved: bool = False):
    return file_delete(path, approved, load_policy())
def write(path: str, content: str, approved: bool = False):
    return file_write(path, content, approved, load_policy())
