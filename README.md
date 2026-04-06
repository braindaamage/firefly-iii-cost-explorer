# Firefly III Cost Explorer

A React SPA for spending analysis that connects to your [Firefly III](https://www.firefly-iii.org/) personal finance instance.

## Features

- Spending trend chart with configurable time ranges
- Breakdown table by category, budget, tag, or account
- Drill-down transaction drawer per group
- CSV and PNG export
- Responsive design (desktop, tablet, mobile)
- Dark theme

## Development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

```bash
npm test        # run tests
npm run build   # production build
```

## Docker Deployment

### Quick Start

```bash
docker compose up -d
```

The app will be available at `http://localhost:8080`.

### Manual Build

```bash
docker build -t cost-explorer .
docker run -d -p 8080:8080 --name cost-explorer cost-explorer
```

### Configuration

1. Open `http://localhost:8080` in your browser
2. Enter your Firefly III instance URL (e.g., `https://firefly.example.com`)
3. Enter your Personal Access Token
4. Click "Test Connection" and then "Save & Continue"

### CORS Configuration

Since the app runs in the browser and connects directly to your Firefly III instance, you need to allow cross-origin requests. If you use **Nginx Proxy Manager**, add the following to the "Advanced" tab of your Firefly III proxy host:

```nginx
add_header Access-Control-Allow-Origin "http://cost-explorer-host:8080" always;
add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Accept, Content-Type" always;

if ($request_method = OPTIONS) {
    return 204;
}
```

Replace `http://cost-explorer-host:8080` with the actual origin where the Cost Explorer is served.
