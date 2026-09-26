# Roadmap

## Regra operacional

**Todo bloco de trabalho termina com atualização de `docs/checkpoints/CHECKPOINT_CURRENT.md`.**  
Se houver mudança material, criar também snapshot histórico em `docs/checkpoints/history/`.

## Fase 0 — Fundação documental
- [x] Criar repositório público.
- [x] README inicial.
- [x] Whitepaper inicial.
- [x] Arquitetura inicial.
- [x] Critérios do Pursekeeper documentados.
- [x] Regras de continuidade.
- [x] Segurança e operação inicial.
- [x] Checkpoint corrente.
- [ ] Aprovar especificação técnica antes da implementação.

## Fase 1 — Especificação
- [ ] Fixar contrato HTTP da V1.
- [ ] Confirmar biblioteca/protocolo x402 Nano.
- [ ] Confirmar facilitator.
- [ ] Recuperar/confirmar endereço Nano público do operador.
- [ ] Fixar preço inicial.
- [ ] Escolher runtime/deploy.
- [ ] Definir limites de payload e formato de erros.
- [ ] Criar plano de implementação testável.

## Fase 2 — Núcleo JSON Lens
- [ ] Canonicalização determinística.
- [ ] SHA-256.
- [ ] Métricas estruturais.
- [ ] Mapa de paths/tipos.
- [ ] Diff before/after.
- [ ] Testes unitários e casos-limite.

## Fase 3 — Nano 402
- [ ] Desafio não pago retorna 402 correto.
- [ ] Incluir network, price e payTo.
- [ ] Decodificar prova de pagamento.
- [ ] Verificar pagamento.
- [ ] Settlement.
- [ ] Entregar resultado apenas após sucesso.
- [ ] Testes de falha/replay conforme suporte do protocolo.

## Fase 4 — Serviço público
- [ ] `POST /api/lens`.
- [ ] `GET /health`.
- [ ] Deploy HTTPS.
- [ ] Teste externo do 402.
- [ ] Verificação de logs e segurança.

## Fase 5 — Pursekeeper: 10 XNO
- [ ] Enviar endpoint ao Pursekeeper.
- [ ] Pursekeeper confirma desafio 402.
- [ ] Primeira chamada paga entrega resultado real.
- [ ] Confirmar serviço listado/online.
- [ ] Registrar evidência do crédito/prepagamento.

## Fase 6 — Janela de 14 dias / 15 XNO
- [ ] Código de pagamento permanece público.
- [ ] Endpoint permanece alcançável.
- [ ] Registrar início da janela.
- [ ] Acompanhar incidentes.
- [ ] Confirmar conclusão dos 14 dias.
- [ ] Registrar segunda parcela.

## Fase 7 — Pós-validação
- [ ] Tag/release V1.
- [ ] Relatório final.
- [ ] Avaliar novos consumidores e extensões sem ampliar riscos desnecessariamente.
