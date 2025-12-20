FROM mcr.microsoft.com/playwright:v1.41.1-jammy

WORKDIR /app

# Copy package files (assuming build context is repo root)
COPY services/reporting/package.json ./
COPY services/reporting/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source
COPY services/reporting/src ./src

# Copy templates from root
COPY reports ./reports

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
