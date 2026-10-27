require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AuditLogEvent, Events } = require('discord.js');
const services = require('./services');
if (!process.env.DISCORD_TOKEN) throw new Error('Defina DISCORD_TOKEN no .env');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});
const replyPrivate = (interaction, content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
const staffId = () => process.env.STAFF_ROLE_ID;
const isStaff = interaction => interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || (staffId() && interaction.member?.roles?.cache?.has(staffId()));
function ticketOwner(channel) { return channel.topic?.match(/^savioboost-owner:(\d+);service:([a-z]+)(?:;closed:1)?$/); }
function isClosed(channel) { return channel.topic?.endsWith(';closed:1'); }
async function finalCategory(guild) {
  const configuredId = process.env.FINALIZED_CATEGORY_ID?.trim();
  if (configuredId) {
    const found = await guild.channels.fetch(configuredId).catch(() => null);
    if (!found || found.type !== ChannelType.GuildCategory) throw new Error('FINALIZED_CATEGORY_ID não é uma categoria válida.');
    return found;
  }
  await guild.channels.fetch();
  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tickets_finalizados');
  if (!category) category = await guild.channels.create({ name: 'Tickets_finalizados', type: ChannelType.GuildCategory, reason: 'Arquivo de tickets SavioBoost' });
  return category;
}
client.once(Events.ClientReady, () => console.log(`SavioBoost online como ${client.user.tag}`));

// Boas-vindas, atribuição de cargos e registro de saídas/moderação.
const recentlyBanned = new Map();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const welcomeChannelId = () => process.env.WELCOME_CHANNEL_ID?.trim();
const moderationChannelId = () => process.env.MODERATION_LOG_CHANNEL_ID?.trim() || process.env.LOG_CHANNEL_ID?.trim();
async function postTo(guild, id, payload) {
  if (!id) return;
  const channel = await guild.channels.fetch(id).catch(() => null);
  if (!channel?.isTextBased() || !('send' in channel)) {
    console.warn(`Canal de avisos inválido ou inacessível: ${id}`);
    return;
  }
  await channel.send(payload).catch(error => console.error(`Falha ao enviar aviso no canal ${id}:`, error.message));
}
function memberRole(guild, envName, fallbackName) {
  const id = process.env[envName]?.trim();
  return (id && guild.roles.cache.get(id)) || guild.roles.cache.find(role => role.name.toLowerCase() === fallbackName.toLowerCase());
}
client.on(Events.GuildMemberAdd, async member => {
  try {
    const assigned = [];
    for (const [key, name] of [['DROPS_ROLE_ID', 'Drops'], ['CLIENTES_ROLE_ID', 'Clientes']]) {
      const role = memberRole(member.guild, key, name);
      if (!role) { console.warn(`Cargo ${name} não encontrado no servidor ${member.guild.name}`); continue; }
      try {
        await member.roles.add(role, 'Cargo automático de entrada SavioBoost');
        assigned.push(role.name);
      } catch (error) { console.error(`Não foi possível dar o cargo ${role.name}:`, error.message); }
    }
    const embed = new EmbedBuilder().setColor(0x31db73).setTitle('👋 Bem-vindo(a) ao SavioBoost!')
      .setDescription(`Seja bem-vindo(a), ${member}! Confira nossos serviços de otimização e abra um ticket quando quiser.`)
      .addFields({ name: 'Cargos de entrada', value: assigned.length ? assigned.join(' • ') : 'Aguardando configuração da equipe' });
    await postTo(member.guild, welcomeChannelId(), { content: `Boas-vindas, ${member}!`, embeds: [embed], allowedMentions: { users: [member.id] } });
  } catch (error) { console.error('Erro ao receber membro:', error); }
});
client.on(Events.GuildBanAdd, async ban => {
  try {
    const key = `${ban.guild.id}:${ban.user.id}`;
    recentlyBanned.set(key, Date.now());
    setTimeout(() => recentlyBanned.delete(key), 15000).unref?.();
    let executor = 'Não identificado';
    let reason = ban.reason || 'Não informado';
    try {
      const audits = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 });
      const entry = audits.entries.find(e => e.target?.id === ban.user.id && Date.now() - e.createdTimestamp < 15000);
      if (entry) { executor = entry.executor?.tag || executor; reason = entry.reason || reason; }
    } catch { console.warn('Sem acesso ao registro de auditoria para detalhes do banimento.'); }
    const embed = new EmbedBuilder().setColor(0xe5484d).setTitle('⛔ Membro banido')
      .addFields({ name: 'Usuário', value: `${ban.user.tag} (${ban.user.id})` }, { name: 'Responsável', value: executor }, { name: 'Motivo', value: reason.slice(0, 1024) });
    await postTo(ban.guild, moderationChannelId(), { embeds: [embed] });
  } catch (error) { console.error('Erro ao registrar banimento:', error); }
});
client.on(Events.GuildMemberRemove, async member => {
  try {
    // Espera a chegada do evento de banimento antes de classificar a saída.
    await wait(2000);
    if (recentlyBanned.has(`${member.guild.id}:${member.id}`)) return;
    let kick = null;
    try {
      const audits = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
      kick = audits.entries.find(e => e.target?.id === member.id && Date.now() - e.createdTimestamp < 8000) || null;
    } catch { console.warn('Sem acesso aos registros de auditoria: saída classificada como não identificada.'); }
    if (kick) {
      const embed = new EmbedBuilder().setColor(0xf59e0b).setTitle('🚪 Membro expulso')
        .addFields({ name: 'Usuário', value: `${member.user.tag} (${member.id})` }, { name: 'Responsável', value: kick.executor?.tag || 'Não identificado' }, { name: 'Motivo', value: (kick.reason || 'Não informado').slice(0, 1024) });
      await postTo(member.guild, moderationChannelId(), { embeds: [embed] });
    } else {
      const embed = new EmbedBuilder().setColor(0x8b93a7).setTitle('👋 Membro saiu do servidor')
        .setDescription(`**${member.user.tag}** (${member.id}) não está mais no servidor.\n*Saída voluntária ou ação não identificada.*`);
      await postTo(member.guild, welcomeChannelId(), { embeds: [embed] });
    }
  } catch (error) { console.error('Erro ao registrar saída:', error); }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'ticket-painel') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return replyPrivate(interaction, 'Você não tem permissão.');
      const embed = new EmbedBuilder().setColor(0x31db73).setTitle('⚡ SAVIOBOOST | Central de Vendas').setDescription('Selecione abaixo o serviço desejado para abrir um atendimento privado. Nossa equipe responderá assim que possível.\n\n**Otimização Start:** R$ 19,90\n**Otimização Advanced:** R$ 49,90\n**Otimização Pro:** R$ 79,90\n**Ativação do Windows:** valor a consultar\n\n*A ativação do Windows requer licença válida.*');
      const menu = new StringSelectMenuBuilder().setCustomId('sb_service').setPlaceholder('Selecione o serviço que deseja contratar...').addOptions(services.map(s => ({ label: `${s.name} | ${s.price}`, value: s.value, description: 'Clique aqui para abrir seu ticket', emoji: s.emoji })));
      await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
      return replyPrivate(interaction, 'Painel de vendas publicado!');
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'sb_service') {
      const service = services.find(s => s.value === interaction.values[0]);
      if (!service || !interaction.guild) return replyPrivate(interaction, 'Serviço inválido.');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const existing = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.topic?.startsWith(`savioboost-owner:${interaction.user.id};`) && !isClosed(c));
      if (existing) return interaction.editReply(`Você já tem um ticket aberto: ${existing}`);
      const permissions = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
      ];
      if (staffId()) permissions.push({ id: staffId(), allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      const category = process.env.TICKET_CATEGORY_ID?.trim();
      const channel = await interaction.guild.channels.create({ name: `compra-${service.value}-${interaction.user.id.slice(-6)}`, type: ChannelType.GuildText, parent: category || undefined, topic: `savioboost-owner:${interaction.user.id};service:${service.value}`, permissionOverwrites: permissions, reason: `Ticket de ${interaction.user.tag} para ${service.name}` });
      const embed = new EmbedBuilder().setColor(0x31db73).setTitle(`${service.emoji} ${service.name}`).addFields({ name: 'Cliente', value: `<@${interaction.user.id}>`, inline: true }, { name: 'Valor', value: service.price, inline: true }, { name: 'Atendimento', value: 'Descreva sua necessidade e aguarde nossa equipe.' }).setFooter({ text: 'SavioBoost • Atendimento privado' });
      const buttons = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('sb_claim').setLabel('Assumir atendimento').setStyle(ButtonStyle.Primary).setEmoji('🙋'), new ButtonBuilder().setCustomId('sb_close').setLabel('Fechar ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
      await channel.send({ content: `<@${interaction.user.id}>${staffId() ? ` <@&${staffId()}>` : ''}`, embeds: [embed], components: [buttons], allowedMentions: { users: [interaction.user.id], roles: staffId() ? [staffId()] : [] } });
      return interaction.editReply(`Seu ticket foi criado: ${channel}`);
    }
    if (interaction.isButton() && ['sb_claim', 'sb_close'].includes(interaction.customId)) {
      const match = ticketOwner(interaction.channel);
      if (!match) return replyPrivate(interaction, 'Este não é um ticket SavioBoost.');
      if (isClosed(interaction.channel)) return replyPrivate(interaction, 'Este ticket já foi finalizado.');
      if (interaction.customId === 'sb_claim') {
        if (!isStaff(interaction)) return replyPrivate(interaction, 'Apenas atendentes podem assumir tickets.');
        await interaction.reply({ content: `🙋 Atendimento assumido por ${interaction.user}.` });
        return;
      }
      if (!isStaff(interaction) && interaction.user.id !== match[1]) return replyPrivate(interaction, 'Apenas o cliente ou a equipe pode fechar o ticket.');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const channel = interaction.channel;
      const category = await finalCategory(interaction.guild);
      // Mantém as permissões individuais do ticket ao mover de categoria.
      await channel.setParent(category.id, { lockPermissions: false });
      await channel.permissionOverwrites.edit(match[1], { ViewChannel: false, SendMessages: false });
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { ViewChannel: false });
      if (staffId()) await channel.permissionOverwrites.edit(staffId(), { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await channel.permissionOverwrites.edit(client.user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, ManageChannels: true });
      await channel.setTopic(`${channel.topic};closed:1`);
      await channel.setName(`finalizado-${channel.name}`.slice(0, 100));
      await interaction.message.edit({ components: [] }).catch(console.error);
      await channel.send(`🔒 **Ticket finalizado** por ${interaction.user}. Histórico preservado nesta categoria.`);
      const logId = process.env.LOG_CHANNEL_ID?.trim();
      if (logId) {
        const log = await interaction.guild.channels.fetch(logId).catch(() => null);
        if (log?.isTextBased()) await log.send(`Ticket finalizado: ${channel} | Cliente: <@${match[1]}> | Finalizado por: ${interaction.user.tag}`).catch(console.error);
      }
      await interaction.editReply(`Ticket finalizado e arquivado em **${category.name}**: ${channel}`);
    }
  } catch (err) {
    console.error('Erro na interação:', err);
    const msg = 'Não foi possível concluir. Confira permissões do bot, cargo de atendimento e categoria configurados.';
    if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral }).catch(console.error);
    else await replyPrivate(interaction, msg).catch(console.error);
  }
});
client.login(process.env.DISCORD_TOKEN);
