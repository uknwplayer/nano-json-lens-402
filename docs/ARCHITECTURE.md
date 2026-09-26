# Architecture

## Logical View
```text
Client
  |
  | POST /api/lens
  v
HTTP Layer
  |
  +-- no payment proof --> HTTP 402 + Nano payment requirements
  |
  +-- proof supplied --> verification / settlement
                              |
                              v
                          JSON Lens
                              |
                              v
                         HTTP 200 result
```

## Components

### 1. HTTP Layer
Validates method, content type, payload size, and basic request shape.

### 2. Payment Gate
Must advertise:
- HTTP 402;
- Nano mainnet;
- price;
- public receiving address;
- metadata required by the selected x402 implementation.

The current reference candidate is `x402nano/exact`. Exact integration will be fixed during the implementation specification.

### 3. JSON Lens
Pure local processing with no network access:
- canonicalization;
- SHA-256;
- metrics;
- paths/types;
- diff.

### 4. Health
`GET /health` is free and provides a simple public availability signal.

## Configuration
The following values must be configurable:
- public Nano receiving address;
- price;
- network;
- facilitator URL/configuration;
- maximum payload size.

No wallet seed or private key may enter the repository.

## Deployment
No provider has been selected yet. Candidates to validate:
1. Vercel / Node serverless;
2. persistent Node service;
3. compatible edge runtime.

Selection criteria: zero or minimal cost, public HTTPS, Nano x402 compatibility, and stability for at least 14 days.

## Minimum Observability
- health endpoint;
- logs that do not retain sensitive payloads;
- verification/settlement status without secrets;
- identifiable build/version.

## Security Boundary
V1 does not fetch arbitrary URLs, execute submitted code, expose user filesystem access, or require persistent storage of submitted documents.
