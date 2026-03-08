# Product Spec: Todo App

This is a simple Todo App spec to test the workgraph compiler.

## TICKET-001: Setup Project

Description: Initialize the project structure and base files.
Owners: package.json, tsconfig.json
Deps:
Evidence: EVID:setup:001

## TICKET-002: Create Database Schema

Description: Define the database schema for todos.
Owners: src/db/schema.ts
Deps: TICKET-001
Evidence: EVID:db:001

## TICKET-003: Implement API Endpoints

Description: Create CRUD endpoints for todos.
Owners: src/api/todos.ts
Deps: TICKET-002
Evidence: EVID:api:001

## TICKET-004: Create Frontend Components

Description: Build the React components for the todo list.
Owners: src/components/TodoList.tsx, src/components/TodoItem.tsx
Deps: TICKET-003
Evidence: EVID:ui:001
