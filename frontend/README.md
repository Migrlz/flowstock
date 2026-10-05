# FlowStock frontend

The frontend is a React and TypeScript application built with Vite. It reads and updates inventory through the FlowStock REST API and displays quantity movement history.

## Run locally

1. Start the Go API from the project root. Use [the database guide](../database/README.md) to configure PostgreSQL and apply the schema.
2. From this directory, install frontend dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

The frontend expects the API at `http://localhost:8080`.

## Checks

```powershell
npm run build
npm run lint
```
