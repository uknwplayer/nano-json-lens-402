# Regras de continuidade

Estas regras existem para que o projeto sobreviva a troca de chat, agente, sessão ou ferramenta sem depender da memória da conversa.

## Regra principal

**É obrigatório atualizar `docs/checkpoints/CHECKPOINT_CURRENT.md` ao final de cada bloco de trabalho.**

Um bloco é qualquer unidade de trabalho que:
- altere código ou documentação;
- tome uma decisão técnica;
- conclua um teste;
- faça deploy;
- altere configuração;
- encontre erro/bloqueio relevante;
- envie algo ao Pursekeeper.

## Ordem de retomada

Qualquer agente novo deve:
1. ler `docs/checkpoints/CHECKPOINT_CURRENT.md`;
2. ler `docs/ROADMAP.md`;
3. consultar documentos citados pelo checkpoint;
4. verificar no repositório se o estado descrito realmente existe;
5. executar somente o próximo passo registrado ou atualizar o plano explicitamente.

## Conteúdo mínimo do checkpoint

- estado atual;
- último bloco concluído;
- decisões vigentes;
- arquivos/commits relevantes;
- testes executados e resultados;
- pendências;
- bloqueios/riscos;
- próximo passo exato;
- itens que exigem confirmação humana;
- data do checkpoint.

## Histórico

Quando um bloco representar marco material, copiar o estado para:
`docs/checkpoints/history/YYYY-MM-DD_NNN.md`.

O arquivo CURRENT é mutável. Os snapshots históricos não devem ser reescritos salvo correção claramente documentada.

## Verdade vs plano

Use:
- **CONCLUÍDO** somente para algo verificado;
- **PLANEJADO** para intenção;
- **BLOQUEADO** para dependência não resolvida;
- **NÃO VERIFICADO** quando não houver evidência suficiente.

Nunca converter intenção em fato no checkpoint.

## Segredos

Nunca registrar seed, chave privada, token, credencial ou header de pagamento reutilizável. Endereço público Nano pode ser registrado quando confirmado.
