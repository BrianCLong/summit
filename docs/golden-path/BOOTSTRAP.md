# Bootstrap a New Service in <15 Minutes

1. **Copy Template**:
   ```bash
   cp -r templates/golden-service-ts services/my-new-service
   ```

2. **Configure**:
   - Edit `services/my-new-service/package.json`: Update `name`.
   - Edit `services/my-new-service/ci.template.yml`: Replace `SERVICE_NAME` with `my-new-service`.
   - Move `ci.template.yml` to `.github/workflows/my-new-service.yml`.

3. **Install & Run**:
   ```bash
   cd services/my-new-service
   npm install
   npm run dev
   ```

4. **Verify**:
   - Health: `curl http://localhost:3000/health`
   - Metrics: `curl http://localhost:3000/metrics`

5. **Commit**:
   ```bash
   git add services/my-new-service .github/workflows/my-new-service.yml
   git commit -m "feat: init my-new-service"
   ```
