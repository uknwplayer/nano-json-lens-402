# Registro de decisões

## D-001 — Repositório dedicado e público
**Status:** aceito  
O serviço fica em `uknwplayer/nano-json-lens-402`, separado do ARCA. Isso reduz acoplamento e atende ao requisito de código público em repositório próprio.

## D-002 — Serviço útil e determinístico
**Status:** proposta de design vigente  
O produto inicial é um JSON Lens, não um stub. Processamento local reduz custo e dependências.

## D-003 — Sem fetch arbitrário na V1
**Status:** proposta de design vigente  
Evita SSRF, timeouts externos e dependência de terceiros.

## D-004 — Endpoint de health gratuito
**Status:** proposta de design vigente  
Separar reachability da operação paga simplifica observabilidade.

## D-005 — Checkpoint obrigatório
**Status:** aceito  
Todo bloco termina atualizando `docs/checkpoints/CHECKPOINT_CURRENT.md`.

## Decisões ainda abertas

- runtime/provedor de deploy;
- versão/biblioteca x402 Nano final;
- facilitator;
- preço definitivo;
- endereço Nano público;
- limites de payload;
- licença.
