# Nano 402 Integration Evidence and Wire Contract

Date: 2026-09-26. Block 004. Status: protocol discovery verified; integration and deployment pending.

## Verified sources

- JavaScript package: [x402nano/exact](https://github.com/x402nano/exact), source tree inspected at `13462c344c7f3c3971a483d6cf5efa780b0ca05f`.
- [Server example](https://github.com/x402nano/exact/blob/13462c344c7f3c3971a483d6cf5efa780b0ca05f/src/typescript/examples/example-server.mjs) and [server scheme](https://github.com/x402nano/exact/blob/13462c344c7f3c3971a483d6cf5efa780b0ca05f/src/typescript/server/scheme.ts).
- [Scheme specification](https://github.com/x402nano/schemes/blob/main/exact.md), blob `35aca2af03fd0debc835968e13dcb5189dee0fa8`.
- [Pursekeeper](https://pursekeeper.dev/) publicly documents its free facilitator.
- npm metadata for `@x402nano/exact/0.3.0` was fetched successfully. Version: `0.3.0`; license: MIT. Integrity: `sha512-LV3GR5NrXIsngSQYgTrz45hn03/y3j6y90LSPq9g4OfKW/D18sW1GjDy6ZUp4+IXqQHmxjruoX3K8kuJUEFZMg==`.
- No dependency was installed and no payment was submitted. Source inspection and metadata retrieval do not establish runtime compatibility.

## Live read-only facilitator check

A successful GET to `https://facilitator.pursekeeper.dev/supported` returned:

```json
{"kinds":[{"x402Version":2,"scheme":"exact","network":"nano:mainnet","extra":{"asset":"XNO","work":"required","workThreshold":"fffffff800000000"}}],"extensions":[],"signers":{}}
```

The web retrieval tool failed to open this host, but a subsequent direct HTTPS GET succeeded. This is evidence of discovery availability, not a successful verification or settlement.

## Integration choice

Pin `@x402nano/exact` to `0.3.0` when dependencies are installed. Use `ExactNanoScheme` from `@x402nano/exact/server`, and `x402ResourceServer` / `HTTPFacilitatorClient` from `@x402/core/server`. The package declares `@x402/core ^2.22.0`; lock the actual resolved dependency tree and run compatibility tests before release.

The nominal price remains 0.01 XNO per call. Exact amount is `10000000000000000000000000000` raw (10^28). Keep decimal and raw amounts as strings, never binary floating-point amounts. Assert the SDK-built amount equals this string in a local test before using it. Do not rely on comments or alternative input forms without checking the generated requirement.

## Wire contract

An unpaid valid request returns HTTP 402. `PAYMENT-REQUIRED` contains base64-encoded JSON with `x402Version: 2`, the public resource URL, and an `accepts` entry containing `scheme: exact`, `network: nano:mainnet`, `asset: XNO`, the raw amount and the operator's confirmed `payTo`.

The buyer returns a base64-encoded `PAYMENT-SIGNATURE` with the accepted requirement and `payload.block`, a signed Nano send state block. The server calls verification and settlement through the SDK. The facilitator routes are `POST /verify` and `POST /settle`; both receive `paymentPayload` and `paymentRequirements`.

Successful verification has `isValid: true`. Successful settlement has `success: true`, `transaction`, `network`, and payer metadata. Only then release HTTP 200 with the actual Lens result and base64-encoded settlement metadata in `PAYMENT-RESPONSE`. Public failures must not include exception stacks or full proofs.

Compute and buffer the bounded result before settlement, then release after settlement. This preserves the approved service contract while avoiding a charge for known computation/size failures. A network interruption after settlement remains a recovery case and must be handled explicitly.

## Remaining integration gates

- Confirm the operator's receiving address; no address from an example may be used.
- Check SDK-built requirements preserve the facilitator's required work metadata; the inspected scheme does not itself merge `supportedKind.extra`.
- Test current SDK initialization, timeouts, parsing and payment response handling locally.
- Verify replay behavior and request binding. The scheme's signed Nano block does not itself prove a binding to the submitted JSON body. Do not claim that copying a resource URL into metadata creates a cryptographic body binding.
- Design concurrency and recovery behavior before payment integration: repeated proof, parallel requests, changed body, and settlement-success/response-loss. Durable payment bookkeeping may be necessary; do not assume a process-local map is enough for serverless deployment.
- Do not run adversarial tests against third-party endpoints. Use a local fake facilitator for failure/concurrency tests; Pursekeeper performs the authorized first real paid call.
- Receiving funds and making them available in a wallet may require the wallet's receive operation; the resource server holds no wallet seed.

## Hosting assessment

[Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) currently list 100,000 requests/day and 10 ms CPU per request on Free, with network waiting excluded from CPU time. Workers is the preferred candidate, conditional on a bundle/runtime test and worst-case Lens CPU measurements. Free-tier limits are not an uptime guarantee.

[Vercel Hobby](https://vercel.com/docs/plans/hobby) restricts use to personal, non-commercial use, so it is not selected for this paid service.

No provider account, public deployment or paid plan was created. No runtime/provider is marked fully validated. Operator account availability remains unknown.

## Execution ruling

Task 1 is partially complete. Protocol sources, package publication and live discovery are verified. Address confirmation, runtime validation, dependency execution tests and payment recovery design remain open. The pure JSON core can be developed independently while these gates remain closed for production payments.
