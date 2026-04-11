# Firefly III rates sidecar

Automatically updates EUR exchange rates in your Firefly III instance every day at 07:00 (local time), using [open.er-api.com](https://open.er-api.com) as the primary source and the ECB XML feed as fallback.

## Quick start

### 1. Generate a Personal Access Token in Firefly III

1. Open Firefly III → **Options → Profile → OAuth**
2. Under **Personal Access Tokens**, click **Create new token**
3. Give it a name (e.g. `rates-sidecar`), leave scope as-is
4. Copy the token — you only see it once

### 2. Create a `.env` file

```bash
cp rates-sidecar/.env.example rates-sidecar/.env
# Edit rates-sidecar/.env and fill in FIREFLY_URL and FIREFLY_PAT
```

### 3. Start the sidecar

```bash
# From the project root, alongside the rest of the stack:
docker compose -f firefly-iii-mcp/docker-compose.dev.yml up -d

# Or just the sidecar (after the Firefly III container is healthy):
docker compose -f firefly-iii-mcp/docker-compose.dev.yml up firefly-rates-sidecar
```

### 4. Verify rates were loaded

```bash
# Check sidecar logs
docker compose -f firefly-iii-mcp/docker-compose.dev.yml logs firefly-rates-sidecar

# Check rates in Firefly III (adjust date and currencies as needed)
curl "http://localhost:8080/api/v1/exchange-rates/EUR/USD" \
  -H "Authorization: Bearer $FIREFLY_PAT" | jq .
```

## Configuring the schedule and currencies (no restart required)

All tuneable settings live in a Firefly III preference under the key `costExplorer.ratesSidecar`. The sidecar polls this preference every 5 minutes and applies changes without restarting.

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Kill switch — set to `false` to pause the sidecar |
| `cronSchedule` | `0 7 * * *` | When to run (cron expression, in container TZ) |
| `primarySource` | `open-er-api` | `"open-er-api"` or `"ecb"` |
| `fallbackEnabled` | `true` | Try the other source if the primary fails 3 times |
| `fallbackSource` | `ecb` | `"ecb"` or `"open-er-api"` |
| `currencyMode` | `active` | `"active"` (query Firefly for active currencies) or `"explicit"` |
| `explicitCurrencies` | `["USD","CLP"]` | Used only if `currencyMode === "explicit"` |
| `baseCurrency` | `EUR` | Rates are expressed as EUR → this currency |

You can edit this preference directly via the Firefly III API, or (in a future UI phase) from the **Settings → Exchange rates** section of the Cost Explorer SPA.

## Environment variables (secrets / infra only)

See `.env.example` for a full list. Only `FIREFLY_URL` and `FIREFLY_PAT` are required.

Changing `TZ` or `LOG_LEVEL` requires restarting the container (they are read at process startup by `node-cron`).

## Logs

All logs are written to stdout as JSON with fields `timestamp`, `level`, `event`, and optional context fields. The PAT is never logged.

```json
{"timestamp":"2026-04-11T07:00:01Z","level":"info","event":"job_start","cronSchedule":"0 7 * * *"}
{"timestamp":"2026-04-11T07:00:03Z","level":"info","event":"job_success","source":"open-er-api","currenciesUpdated":3,"durationMs":1820}
```

## Development / testing

```bash
cd rates-sidecar
npm install
npm test
```

## Known limitations

- `currencyMode: "active"` fetches up to 200 active currencies from Firefly III in
  a single page. Users with >200 active currencies should use `currencyMode: "explicit"`
  and list currencies manually in the `costExplorer.ratesSidecar` preference.
