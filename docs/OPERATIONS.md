# Operação e disponibilidade

## Meta inicial

Manter o endpoint público e funcional durante toda a janela exigida pelo Pursekeeper, com margem além dos 14 dias.

## Health

Planejado:
`GET /health`

Resposta mínima deverá indicar:
- status;
- versão/build;
- timestamp do servidor, se útil.

Não deve depender de pagamento.

## Incidentes

Se houver indisponibilidade:
1. registrar horário aproximado;
2. identificar causa;
3. restaurar serviço;
4. testar health;
5. testar desafio 402;
6. atualizar checkpoint;
7. avaliar se é necessário informar/reiniciar contagem com Pursekeeper.

## Deploy

O provedor ainda será escolhido. Não assumir Vercel, servidor persistente ou edge até teste de compatibilidade com a biblioteca Nano 402.

## Mudanças durante janela

Evitar mudanças de alto risco durante os 14 dias. Correções urgentes devem ser pequenas, testadas e documentadas.
