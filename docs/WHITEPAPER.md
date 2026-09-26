# Whitepaper — Nano JSON Lens 402

## Abstract
Nano JSON Lens 402 is an HTTP microservice for agents, pipelines, and developers that need to inspect, compare, and identify JSON documents deterministically. Access to the primary resource will be gated by a Nano mainnet micropayment using HTTP 402.

## Problem
Agents frequently consume JSON from APIs and need mechanical answers: Did the document change? What is its hash? What is its structure? Which paths exist? What is its depth? Which types occur? A small deterministic service can provide these operations without placing an AI model or paid API in the critical path.

## Proposal
The client submits either one document or a before/after pair. After successful payment verification, the service locally performs:
- canonicalization;
- SHA-256 hashing;
- structural metrics;
- path/type enumeration;
- structural diff when requested.

## Initial Economic Model
Design target: **0.01 XNO per call**, subject to validation before deployment. The final price must be configurable and explicitly advertised in the HTTP 402 challenge.

## Desired Properties
- deterministic behavior;
- low operating cost;
- no paid AI dependency;
- machine-readable responses;
- explicit payload limits;
- no custody of wallet secrets when unnecessary.

## Initial Scope
V1 will not execute arbitrary JSONPath expressions, fetch external URLs, execute client code, or act as a proxy. This reduces attack surface and keeps the first version auditable.

## Success Criteria
V1 is operational when local and public tests confirm the API contract, the 402 challenge is correct, a paid call can be verified and settled, and the service remains observable through a health endpoint.
