# SavioBoost Bot — Tickets de vendas

## Instalação
1. Instale Node.js 20.11+ e abra esta pasta no terminal.
2. Execute `npm install`.
3. Copie `.env.example` para `.env` e preencha os IDs e o token do bot.
4. No Discord Developer Portal, instale o bot no servidor com `bot` e `applications.commands`. Dê permissões **Manage Channels**, **View Channels**, **Send Messages**, **Read Message History** e **Embed Links**. Para os eventos de entrada/saída é necessária a Server Members Intent.
5. Execute `npm run deploy` e `npm start`.
6. No canal de vendas, use `/ticket-painel` (requer permissão Gerenciar Servidor).

## Configurações
- `STAFF_ROLE_ID`: cargo que poderá ver e assumir os tickets. Recomendado configurar.
- `TICKET_CATEGORY_ID`: categoria onde criar tickets (o bot precisa poder criar canais e gerenciar permissões).
- `FINALIZED_CATEGORY_ID`: opcional. ID da categoria de tickets finalizados. Se vazio, o bot encontra ou cria `Tickets_finalizados`.
- `LOG_CHANNEL_ID`: canal opcional de registros de encerramento.
- Edite os preços e serviços em `src/services.js` e no texto do embed em `src/index.js`.

## Observações
- O sistema impede um segundo ticket simultâneo por usuário, verificando os canais em cache.
- Fechar ticket **não exclui** o canal: move para `Tickets_finalizados`, retira o acesso do cliente e mantém as mensagens. O cargo de suporte e administradores podem consultar o histórico.
- Tickets finalizados não impedem que o cliente abra um novo ticket.
- O bot precisa de **Gerenciar Canais** e permissão para gerenciar as permissões dos canais.
- Para ativação do Windows, utilize somente licenças legítimas. O bot não fornece chaves de ativação.
- Não publique seu `.env` nem o token.
- Esta versão contém somente o sistema de tickets de vendas. Se você já tem outro bot com moderação e boas-vindas, faça backup e integre os arquivos em vez de substituir seu projeto inteiro.

## Entrada, saída, expulsão e banimento
- Ative **Server Members Intent** em Developer Portal > Savinho > Bot > Privileged Gateway Intents. Sem isso, o bot não conecta.
- Configure `WELCOME_CHANNEL_ID` (boas-vindas e saídas) e `MODERATION_LOG_CHANNEL_ID` (expulsões e banimentos); o segundo usa `LOG_CHANNEL_ID` como alternativa.
- Configure `DROPS_ROLE_ID` e `CLIENTES_ROLE_ID`. Se vazios, o bot procura cargos com os nomes exatos **Drops** e **Clientes**.
- Dê ao bot **Manage Roles**, deixe o cargo do bot **acima** dos cargos Drops e Clientes e conceda **View Audit Log** para identificar expulsões e responsáveis por bans.
- Para evitar confundir expulsões com saídas, o bot consulta os registros de auditoria recentes. Caso não tenha acesso ou o registro demore, informa **saída ou ação não identificada**.
- O evento de banimento é registrado no canal privado. Sem `MODERATION_LOG_CHANNEL_ID` e `LOG_CHANNEL_ID`, esse registro não é enviado.
- Reinicie com `npm start`. Não precisa de novo deploy dos comandos.
