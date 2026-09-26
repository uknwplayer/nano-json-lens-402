# Arquitetura

## Visão lógica

```text
Cliente
  |
  | POST /api/lens
  v
Camada HTTP
  |
  +-- sem prova de pagamento --> HTTP 402 + requisitos Nano
  |
  +-- com prova --> verificação/settlement
                        |
                        v
                   JSON Lens
                        |
                        v
                 resposta HTTP 200
```

## Componentes

### 1. Camada HTTP
Valida método, content-type, tamanho e formato básico.

### 2. Payment Gate
Deve anunciar:
- HTTP 402;
- rede Nano mainnet;
- preço;
- endereço público de recebimento;
- metadados exigidos pela implementação x402 escolhida.

A implementação de referência considerada é `x402nano/exact`. A integração exata será fixada durante a especificação de implementação.

### 3. JSON Lens
Código puro, sem rede:
- canonicalização;
- SHA-256;
- métricas;
- paths/tipos;
- diff.

### 4. Health
`GET /health` não depende de pagamento e deve permitir verificar disponibilidade do serviço.

## Configuração

Valores que devem ser configuráveis:
- endereço Nano público de recebimento;
- preço;
- network;
- URL/configuração do facilitator;
- limite máximo de payload.

Nenhuma seed/chave privada deve entrar no repositório.

## Deploy

Ainda não escolhido definitivamente. Opções a validar:
1. Vercel/Node serverless;
2. serviço Node persistente;
3. runtime edge compatível.

Critérios: custo zero ou mínimo, HTTPS público, compatibilidade com x402 Nano e estabilidade por pelo menos 14 dias.

## Observabilidade mínima

- health check;
- logs sem payload sensível;
- status de verificação/settlement sem registrar segredo;
- versão/build identificável.

## Segurança

Sem fetch arbitrário de URLs, execução de código, acesso a filesystem do usuário ou armazenamento obrigatório do documento enviado.
