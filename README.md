# n8n EVM Read Contract Node

A custom n8n node that performs read-only (view/pure) calls against EVM-compatible smart contracts using [viem](https://viem.sh/).

## Features
- Supply a RPC URL, contract address, and ABI JSON.
- Auto-populate view/pure functions from the ABI for selection.
- Optional JSON array of arguments for the chosen function.
- Returns structured results for each item: `{ success, data, error }`.

## Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the TypeScript sources:
   ```bash
   npm run build
   ```

The compiled files are emitted to `dist/` for use as a custom n8n community node.

## Running n8n with Docker Compose
The repository includes a minimal `docker/docker-compose.yml` that mounts this custom node into a local n8n instance. To start n8n with the node available:

1. Build the project (optional but recommended so n8n sees compiled code):
   ```bash
   npm run build
   ```
2. From the repository root, launch Docker Compose:
   ```bash
   cd docker
   docker compose up -d
   ```
3. Open http://localhost:5678 and log in. The custom node appears under **Nodes** → **Community** once n8n finishes loading.

### Notes
- The compose file mounts the repository into `/home/node/.n8n/custom` inside the container so you can iterate locally without rebuilding the image.
- To enable UI authentication, uncomment the `N8N_BASIC_AUTH_*` variables in `docker/docker-compose.yml`.
- To stop the stack: `docker compose down`.
