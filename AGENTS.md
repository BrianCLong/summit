# SummitThreat Agent Guidelines

This document provides guidelines for AI agents working on the SummitThreat codebase.

## Project Structure

*   `backend/`: Contains the FastAPI backend application.
    *   `app/`: The main application module.
    *   `tests/`: Unit and integration tests for the backend.
*   `frontend/`: Contains the Streamlit frontend application.
*   `docs/`: Contains project documentation.

## Technologies

*   **Backend:** Python 3.11+, FastAPI, Pydantic, SQLAlchemy
*   **Frontend:** Streamlit, Gradio
*   **Databases:** PostgreSQL, Neo4j, Pinecone/Chroma
*   **Testing:** Pytest

## Development Workflow

1.  Always create a new branch for each feature or bug fix.
2.  Follow the coding style enforced by the linter.
3.  Write unit tests for all new backend code.
4.  Update the documentation for any changes to the API or architecture.
5.  Ensure all tests pass before submitting a pull request.
