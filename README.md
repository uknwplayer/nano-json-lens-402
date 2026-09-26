# Nano JSON Lens 402

Serviço público e determinístico de análise estrutural de JSON, protegido por pagamento Nano via HTTP 402.

## Objetivo

Construir um endpoint útil para agentes e automações que aceite documentos JSON, cobre uma pequena quantia em Nano (mainnet) e entregue análise estrutural reproduzível sem depender de APIs pagas.

O projeto nasce também para cumprir os critérios do **seller newcomer credit** do Pursekeeper: validação 402, primeira chamada paga funcional e disponibilidade pública continuada.

## Estado

**Fase atual:** documentação e desenho técnico inicial.  
**Implementação do endpoint:** ainda não iniciada.  
**Deploy:** ainda não realizado.

Consulte sempre:
- [Checkpoint corrente](docs/checkpoints/CHECKPOINT_CURRENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Whitepaper](docs/WHITEPAPER.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Critérios Pursekeeper](docs/PURSEKEEPER_ACCEPTANCE.md)
- [Regras de continuidade](docs/CONTINUITY_RULES.md)

## Serviço planejado

Entrada principal:

```json
{"document":{"example":true}}
```

Modo comparação:

```json
{"before":{"a":1},"after":{"a":2}}
```

Saída planejada:
- JSON canônico com chaves ordenadas;
- SHA-256;
- tamanho e profundidade;
- contagem de objetos, arrays e chaves;
- mapa de paths/tipos;
- diff estrutural para `before/after`;
- erros claros para entrada inválida ou acima dos limites.

## Endpoints planejados

- `POST /api/lens` — recurso pago.
- `GET /health` — verificação pública de disponibilidade.

## Princípios

1. Sem seed ou chave privada no código.
2. Sem API paga necessária para produzir o resultado.
3. Resultado determinístico e testável.
4. Pagamento validado antes da entrega do recurso pago.
5. Código de recebimento de pagamentos público neste repositório.
6. Checkpoint atualizado ao final de **todo bloco de trabalho**.

## Regra de retomada

Um novo chat/agente deve começar lendo `docs/checkpoints/CHECKPOINT_CURRENT.md`, depois `docs/ROADMAP.md`. Não deve assumir que algo foi executado apenas porque aparece como planejado.

## Licença e versão

Licença e política de versionamento serão definidas antes da primeira release pública operacional.
