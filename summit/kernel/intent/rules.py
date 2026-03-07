def match_intent_layer(content: str) -> str:
    content_lower = content.lower()
    if 'fastapi' in content_lower or 'typer' in content_lower:
        return 'api'
    if 'sqlalchemy' in content_lower:
        return 'storage'
    if 'jwt' in content_lower or 'bcrypt' in content_lower:
        return 'security'
    return 'logic'

def match_intent_component(content: str, filename: str) -> str:
    name_lower = filename.lower()
    if 'auth' in name_lower:
        return 'authentication'
    if 'db' in name_lower or 'model' in name_lower:
        return 'database'
    if 'api' in name_lower or 'route' in name_lower:
        return 'routing'
    return 'unknown'
