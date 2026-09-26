# Segurança

## Princípios

- Nunca armazenar seed/chave privada Nano.
- Nunca commitar tokens de deploy ou facilitator.
- O endereço Nano de recebimento é público e pode ser configurado separadamente.
- Validar payload antes de processamento.
- Aplicar limite de tamanho e profundidade.
- Não executar código enviado pelo cliente.
- Não buscar URLs fornecidas pelo cliente na V1.
- Não usar eval.
- Evitar persistir documentos recebidos.
- Sanitizar logs.

## Payment gate

O resultado pago não deve ser entregue antes da verificação bem-sucedida. Falhas de pagamento devem ser explícitas e não devem cair silenciosamente em modo gratuito.

## Disponibilidade

O health check deve ser barato e independente da lógica pesada. A janela de 14 dias exige atenção a falhas de deploy/configuração.

## Dependências

Antes da release:
- fixar versões adequadamente;
- revisar dependências transitivas críticas;
- executar testes;
- evitar dependências desnecessárias.

## Dados

O serviço deve ser tratado como processador transitório: recebe JSON, calcula a resposta e descarta o conteúdo, salvo mudança futura explicitamente documentada.
