# Schema Plan for Multi-Product Architecture

## Objective
Establish a shared database schema to support multiple products (FactFlow, FactLaw, etc.) with a focus on organization-level tenancy and secure claim tracking.

## Proposed Tools
- **Alembic**: For Python-based database migrations, integrated with SQLAlchemy models in `api/`.
- **PostgreSQL**: Primary relational database for structured data.

## Proposed Schema

### 1. `organizations` Table
Stores tenant information.
- `id`: UUID (Primary Key)
- `name`: String (Required)
- `slug`: String (Unique, Indexed)
- `created_at`: Timestamp
- `settings`: JSONB (For product-specific configuration)

### 2. `verification_requests` Table
Stores individual verification tasks.
- `id`: UUID (Primary Key)
- `organization_id`: UUID (Foreign Key -> organizations.id)
- `claim_text_hash`: String (SHA-256, Indexed)
- `claim_text_encrypted`: Blob (Nullable, for secure storage)
- `product_slug`: String (e.g., 'factflow', 'factgov')
- `status`: String (e.g., 'pending', 'processing', 'completed', 'failed')
- `verdict`: String (Nullable)
- `confidence`: Float (Nullable)
- `metadata`: JSONB (Product-specific request/response data)
- `created_at`: Timestamp

## Security Considerations
- **No Raw Text by Default**: We will store only the hash of the claim by default. Raw text will only be stored if encrypted and explicitly enabled.
- **Organization Isolation**: Every query MUST include an `organization_id` filter.

## Next Steps (Week 2)
1. Install `alembic` and `psycopg2-binary`.
2. Initialize Alembic in `api/db/migrations/`.
3. Create the first migration for `organizations` and `verification_requests`.
4. Implement base SQLAlchemy models in `api/models/`.
