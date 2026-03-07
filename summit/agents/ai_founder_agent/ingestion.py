def parse_idea(file_path: str) -> str:
    """Parse idea from markdown or text file"""
    # TODO: implement deterministic parsing
    with open(file_path, "r") as f:
        return f.read()
