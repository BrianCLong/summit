.PHONY: dev lint docker
dev: ; node src/index.js
lint: ; npx prettier -w .
docker: ; docker build -t webapp:dev .
