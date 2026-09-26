# Whitepaper — Nano JSON Lens 402

## Resumo

Nano JSON Lens 402 é um microserviço HTTP destinado a agentes, pipelines e desenvolvedores que precisam inspecionar, comparar e identificar documentos JSON de forma determinística. O acesso ao recurso principal será condicionado a micropagamento em Nano mainnet por meio do padrão HTTP 402.

## Problema

Agentes frequentemente recebem JSON de APIs e precisam responder perguntas mecânicas: o documento mudou? Qual seu hash? Qual sua estrutura? Quais paths existem? Qual a profundidade? Que tipos aparecem? Um serviço pequeno e determinístico pode oferecer essas operações sem introduzir um modelo de IA ou uma API paga no caminho crítico.

## Proposta

O cliente envia um documento ou um par before/after. Após a confirmação do pagamento, o serviço executa localmente:
- canonicalização;
- SHA-256;
- métricas estruturais;
- enumeração de paths e tipos;
- diff estrutural quando solicitado.

## Modelo econômico inicial

Preço-alvo de projeto: **0,01 XNO por chamada**, sujeito a validação antes do deploy. O preço final deve ficar configurável e explicitamente informado no desafio HTTP 402.

## Propriedades desejadas

- determinismo;
- baixo custo operacional;
- ausência de dependência de IA paga;
- resposta legível por máquinas;
- limites explícitos de payload;
- nenhuma custódia de segredo da carteira no servidor quando desnecessária.

## Escopo inicial

A V1 não busca executar JSONPath arbitrário, buscar URLs externas, rodar código do cliente ou transformar o serviço em proxy. Isso reduz superfície de ataque e torna a primeira versão auditável.

## Sucesso

A V1 é considerada operacional quando testes locais e públicos confirmarem o contrato, o desafio 402 estiver correto, uma chamada paga puder ser verificada/settled e o serviço permanecer observável por health check.
