# Use a base PostgreSQL image
FROM postgres:15-alpine

# Install pgvector extension (Temporarily commented out due to build issues)
# pgvector requires build tools and PostgreSQL development headers
RUN apk add --no-cache build-base postgresql-dev git     && git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git     && cd pgvector     && make     && make install     && cd ..     && rm -rf pgvector     && apk del build-base postgresql-dev git
