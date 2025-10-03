# Third-Party Dependencies Analysis

## JavaScript/Node.js Dependencies

### Main Dependencies (package.json)

- **axios**: ^1.11.0 - HTTP client library (MIT)
- **cross-env**: ^10.0.0 - Cross-platform environment variable setting (MIT)
- **docx**: ^9.5.1 - Word document generation (MIT)
- **dotenv**: ^17.2.1 - Environment variable loading (BSD-2-Clause)
- **jest-extended**: ^4.0.2 - Extended Jest matchers (MIT)
- **neo4j-driver**: ^5.28.1 - Neo4j database driver (Apache-2.0)
- **pg**: ^8.16.3 - PostgreSQL client (MIT)
- **redis**: ^5.8.1 - Redis client (MIT)
- **ws**: ^8.18.3 - WebSocket client/server (MIT)

### Development Dependencies

- **@commitlint/cli**: ^19.8.1 - Commit message linting (MIT)
- **@commitlint/config-conventional**: ^19.8.1 - Conventional commit config (MIT)
- **@eslint/js**: ^9.33.0 - ESLint JavaScript rules (MIT)
- **@playwright/test**: ^1.54.2 - E2E testing framework (Apache-2.0)
- **@semantic-release/changelog**: ^6.0.3 - Changelog management (MIT)
- **@semantic-release/git**: 10.0.1 - Git release management (MIT)
- **@semantic-release/github**: ^11.0.4 - GitHub release management (MIT)
- **@semantic-release/npm**: ^12.0.2 - NPM release management (MIT)
- **@swc/core**: ^1.13.5 - Rust-based JavaScript compiler (Apache-2.0)
- **@swc/jest**: ^0.2.39 - Jest transformer (Apache-2.0)
- **@types/jest**: ^29.5.14 - TypeScript definitions for Jest (MIT)
- **@typescript-eslint/eslint-plugin**: ^8.15.0 - ESLint TypeScript plugin (MIT)
- **@typescript-eslint/parser**: ^8.15.0 - ESLint TypeScript parser (BSD-2-Clause)
- **concurrently**: ^9.2.0 - Run multiple commands concurrently (MIT)
- **globals**: ^15.12.0 - Global variables for JavaScript (MIT)
- **husky**: ^9.1.7 - Git hooks (MIT)
- **jest**: ^29.7.0 - Testing framework (MIT)
- **jest-environment-jsdom**: ^30.0.5 - JSDOM environment for Jest (MIT)
- **jest-watch-typeahead**: ^2.2.2 - Fast interactive watch mode for Jest (MIT)
- **lint-staged**: ^16.1.5 - Lint staged files (MIT)
- **markdownlint-cli**: ^0.45.0 - Markdown linter (MIT)
- **prettier**: ^3.6.2 - Code formatter (MIT)
- **semantic-release**: ^24.2.7 - Automated release tool (MIT)
- **ts-jest**: ^29.2.6 - Jest transformer for TypeScript (MIT)
- **typescript**: ^5.7.3 - TypeScript compiler (Apache-2.0)

### Client Dependencies (client/package.json)

- **@apollo/client**: GraphQL client for React (MIT)
- **@emotion/react**: Styling library (MIT)
- **@emotion/styled**: Styling library (MIT)
- **@mui/icons-material**: Material UI icons (MIT)
- **@mui/material**: Material UI components (MIT)
- **@tanstack/react-query**: Data fetching library (MIT)
- **@types/node**: TypeScript definitions for Node.js (MIT)
- **@vitejs/plugin-react**: Vite React plugin (MIT)
- **cytoscape**: Graph visualization library (MIT)
- **eslint-plugin-react-hooks**: ESLint plugin for React hooks (MIT)
- **eslint-plugin-react-refresh**: ESLint plugin for React refresh (MIT)
- **react**: React framework (MIT)
- **react-dom**: React DOM renderer (MIT)
- **react-router-dom**: Routing library (MIT)
- **vite**: Build tool (MIT)

### Server Dependencies (server/package.json)

- **@graphql-tools/schema**: GraphQL schema tools (MIT)
- **@graphql-tools/utils**: GraphQL utilities (MIT)
- **@nestjs/common**: NestJS common utilities (MIT)
- **@nestjs/core**: NestJS core (MIT)
- **@nestjs/graphql**: NestJS GraphQL integration (MIT)
- **@nestjs/platform-express**: NestJS Express adapter (MIT)
- **apollo-server-express**: Apollo GraphQL server (MIT)
- **class-validator**: Validation library (MIT)
- **express**: Web framework (MIT)
- **graphql**: GraphQL specification implementation (MIT)
- **graphql-scalars**: GraphQL scalar types (MIT)
- **joi**: Validation library (BSD-3-Clause)
- **neo4j-driver**: Neo4j driver (Apache-2.0)
- **reflect-metadata**: Metadata reflection (Apache-2.0)

## Python Dependencies

### Python Dependencies (from server/requirements.txt)

- **fastapi**: Web framework (MIT)
- **uvicorn**: ASGI server (BSD-3-Clause)
- **sqlalchemy**: ORM (MIT)
- **psycopg2-binary**: PostgreSQL adapter (LGPL-3.0, psycopg2-3.0)
- **redis**: Redis client (MIT)
- **pydantic**: Data validation library (MIT)
- **python-multipart**: Multipart data parsing (Apache-2.0)
- **openai**: OpenAI API client (MIT)
- **transformers**: ML models library (Apache-2.0)
- **torch**: PyTorch deep learning library (BSD-3-Clause)
- **sentence-transformers**: Sentence embeddings (Apache-2.0)
- **spacy**: NLP library (MIT)
- **tesseract**: OCR engine (Apache-2.0)
- **yolov5**: YOLO object detection (GPL-3.0)

## Docker Images & Infrastructure

### Docker Base Images

- **node:20-bullseye**: Node.js runtime (MIT license applies to Node.js)
- **postgres:16-alpine**: PostgreSQL database (PostgreSQL License - similar to BSD/MIT)
- **neo4j:5.8**: Graph database (GPL-3.0 for open source, commercial license required for some features)
- **redis:7-alpine**: Redis (3-clause BSD)
- **openpolicyagent/opa**: Open Policy Agent (Apache-2.0)
- **jaegertracing/all-in-one**: Distributed tracing (Apache-2.0)
- **otel/opentelemetry-collector-contrib**: OpenTelemetry (Apache-2.0)
- **prom/prometheus**: Monitoring (Apache-2.0)
- **grafana/grafana**: Visualization (AGPL-3.0)
- **confluentinc/cp-zookeeper**: Apache Zookeeper (Apache-2.0)
- **confluentinc/cp-kafka**: Apache Kafka (Apache-2.0)

## Licenses Summary

### Permissive Licenses (MIT, BSD, Apache-2.0)

- Majority of frontend and backend JavaScript/TypeScript dependencies (MIT, BSD-2/3-Clause, Apache-2.0)
- Most Python dependencies (MIT, Apache-2.0)
- Most Docker base images (MIT, BSD, Apache-2.0)

### Copyleft Licenses (GPL, AGPL)

- **Grafana**: AGPL-3.0 (strong copyleft - may require distribution of source code modifications)
- **Neo4j Community Edition**: GPL-3.0 (strong copyleft)
- **YoloV5**: GPL-3.0 (strong copyleft - may affect distribution of derived work)

### Special Considerations

1. **Neo4j Licensing**: The project uses Neo4j 5 Community Edition which is GPL-3.0 licensed. For commercial use, Neo4j Enterprise Edition (commercial license) would be required.

2. **Grafana Licensing**: The project uses Grafana which is AGPL-3.0 licensed. This may require making source modifications available if the modified version is used over a network.

3. **YoloV5**: The object detection model is GPL-3.0 licensed, which may impact distribution of products containing this code.

4. **Confluent Platform**: While Apache Kafka is Apache-2.0, Confluent's distribution may have additional licensing terms beyond the base Apache license.

## License Compatibility Notes

The project is primarily composed of permissively licensed components (MIT, Apache-2.0, BSD), which are compatible with each other and with commercial use. However, the use of GPL/AGPL components (Neo4j Community, Grafana, YoloV5) requires careful consideration, especially for commercial distribution.

The project itself is licensed under MIT (as noted in the LICENSE file), which is compatible with all the major dependencies used.
