require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
for (const key of required) if (!process.env[key]) throw new Error(`Configure ${key} no .env`);
const commands = [new SlashCommandBuilder().setName('ticket-painel').setDescription('Publica o painel de vendas SavioBoost').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).toJSON()];
(async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
  console.log('Comando /ticket-painel registrado!');
})().catch(console.error);
