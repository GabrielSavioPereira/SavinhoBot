const {SlashCommandBuilder,PermissionFlagsBits}=require('discord.js');
const admin=PermissionFlagsBits.ManageGuild;
const definitions=[
 new SlashCommandBuilder().setName('ticket-painel').setDescription('Publica o painel de tickets').setDefaultMemberPermissions(admin),
 new SlashCommandBuilder().setName('ticket-fechar').setDescription('Fecha o ticket atual'),
 new SlashCommandBuilder().setName('ticket-adicionar').setDescription('Adiciona usuário ao ticket').addUserOption(o=>o.setName('usuario').setDescription('Usuário').setRequired(true)),
 new SlashCommandBuilder().setName('ticket-remover').setDescription('Remove usuário do ticket').addUserOption(o=>o.setName('usuario').setDescription('Usuário').setRequired(true)),
 new SlashCommandBuilder().setName('ticket-transcript').setDescription('Exporta mensagens do ticket'),
 new SlashCommandBuilder().setName('ban').setDescription('Banir membro').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption(o=>o.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(o=>o.setName('motivo').setDescription('Motivo')),
 new SlashCommandBuilder().setName('kick').setDescription('Expulsar membro').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption(o=>o.setName('usuario').setDescription('Usuário').setRequired(true)).addStringOption(o=>o.setName('motivo').setDescription('Motivo')),
 new SlashCommandBuilder().setName('limpar').setDescription('Apagar mensagens recentes').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(o=>o.setName('quantidade').setDescription('2 a 100').setMinValue(2).setMaxValue(100).setRequired(true))
];
module.exports=definitions;
