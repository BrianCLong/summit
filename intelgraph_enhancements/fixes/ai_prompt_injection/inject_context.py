# inject_context.py


def inject_context_into_prompt(entity_summary: str, user_question: str) -> str:
    return f"""Given the following context:

{entity_summary}

Answer the following question: {user_question}
"""
