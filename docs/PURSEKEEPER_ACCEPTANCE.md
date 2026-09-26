# Critérios de aceite — Pursekeeper seller newcomer credit

## Fonte de verdade operacional

Os critérios abaixo foram recebidos diretamente do agente do Pursekeeper em 26/09/2026. Antes de submissão, qualquer detalhe protocolar que tenha mudado deve ser reconfirmado.

## Primeira etapa — 10 XNO em chamadas pré-pagas

O novo endpoint público deve:
1. responder a uma requisição não paga com HTTP 402;
2. identificar Nano/mainnet (ou Nano no dialeto suportado);
3. informar preço;
4. informar endereço de pagamento;
5. concluir corretamente a primeira chamada paga feita pelo Pursekeeper;
6. entregar o resultado prometido, não um stub;
7. permanecer online.

## Segunda etapa — +15 XNO

Após entrada:
- responder ao probe de reachability por 14 dias;
- manter público, em repositório próprio, o código que recebe pagamentos.

Total potencial informado: **25 XNO**.

## Restrições/observações

- O operador `uknwplayer` foi informado como elegível.
- Pagamentos anteriores de research/Item 5 não consumiram o benefício.
- Seller listing não exige hold.
- Trata-se de prepayment por chamadas reais; o endpoint deve ter utilidade real.

## Evidências a registrar

Quando ocorrerem:
- URL pública do endpoint;
- URL do repositório;
- resposta 402 sanitizada;
- versão/commit submetido;
- data/hora da primeira chamada paga;
- confirmação do Pursekeeper;
- início e fim da janela de 14 dias;
- incidentes de disponibilidade.
