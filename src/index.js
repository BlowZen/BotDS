const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getDiscordIDs } = require("./googleSheet"); // Import du module Google Sheet
require('dotenv').config();

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

const ROLE_ID = '1352243600859070506'; // ID du rôle "Membre vérifié"
const NEW_MEMBER_ROLE_ID = '1352585722040680469'; // ID du rôle "Nouveau Membre"
const CHANNEL_ID = '1352270110483808391'; // ID du canal de vérification
const LOG_CHANNEL_ID = '1352599410030153778'; // ID du canal des logs (à définir dans ton serveur)

client.once('ready', async () => {
    console.log('✅ Bot is online!');
    
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Le canal spécifié est introuvable.");

    // 🧹 Suppression des anciens messages du salon
    try {
        const messages = await channel.messages.fetch();
        await channel.bulkDelete(messages, true); // 'true' pour ignorer les messages trop anciens
        console.log("🧹 Salon nettoyé !");
    } catch (error) {
        console.error("❌ Impossible de nettoyer le salon :", error);
    }

    // 📩 Envoi du message de vérification unique
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("verify")
            .setLabel("✅ Vérifier mon compte")
            .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
        content: "Cliquez sur le bouton ci-dessous pour obtenir le rôle de Membre Vérifié.",
        components: [row]
    });

    console.log("📩 Message de vérification envoyé !");
});

client.on("guildMemberAdd", async (member) => {
    console.log(`👤 Nouveau membre : ${member.user.tag}`);

    const newMemberRole = member.guild.roles.cache.get(NEW_MEMBER_ROLE_ID);
    if (newMemberRole) {
        try {
            await member.roles.add(newMemberRole);
            console.log(`🎉 Rôle "Nouveau Membre" attribué à ${member.user.tag}`);
        } catch (error) {
            console.error(`❌ Impossible d'attribuer le rôle "Nouveau Membre" à ${member.user.tag} :`, error);
        }
    } else {
        console.error("❌ Le rôle 'Nouveau Membre' n'existe pas !");
    }

    // Expiration du rôle "Nouveau Membre" après 48 heures
    setTimeout(async () => {
        const member = await member.guild.members.fetch(member.id);
        const newMemberRole = member.guild.roles.cache.get(NEW_MEMBER_ROLE_ID);

        if (member && newMemberRole && member.roles.cache.has(newMemberRole.id)) {
            await member.roles.remove(newMemberRole);
            console.log(`🕑 Le rôle "Nouveau Membre" a été retiré de ${member.user.tag} après expiration.`);
            const logChannel = await member.guild.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
                logChannel.send(`🕑 Le rôle "Nouveau Membre" a été retiré de ${member.user.tag} après 48 heures sans vérification.`);
            }
        }
    }, 48 * 60 * 60 * 1000); // 48 heures (en millisecondes)
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "verify") return;

    const role = interaction.guild.roles.cache.get(ROLE_ID);
    const newMemberRole = interaction.guild.roles.cache.get(NEW_MEMBER_ROLE_ID);
    
    if (!role) return interaction.reply({ content: "❌ Le rôle de vérification n'existe pas !", ephemeral: true });

    try {
        const userId = interaction.user.id;

        // 🔄 Récupération des IDs depuis Google Sheets
        const sheetIDs = await getDiscordIDs();
        console.log(`📜 IDs récupérés de Google Sheets :`, sheetIDs);

        if (sheetIDs.includes(userId)) {
            await interaction.member.roles.add(role);
            console.log(`✔️ Utilisateur ${interaction.user.tag} (${userId}) vérifié.`);

            // 🚀 Suppression du rôle "Nouveau Membre"
            if (newMemberRole && interaction.member.roles.cache.has(newMemberRole.id)) {
                await interaction.member.roles.remove(newMemberRole);
                console.log(`🗑️ Rôle "Nouveau Membre" retiré à ${interaction.user.tag}`);
            }

            // Envoi d'un message dans le canal des logs
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
                logChannel.send(`✔️ ${interaction.user.tag} a été vérifié et le rôle "Nouveau Membre" a été retiré.`);
            }

            await interaction.reply({ content: "✅ Vous avez été vérifié avec succès !", ephemeral: true });
        } else {
            await interaction.reply({ content: "❌ Votre ID ne correspond pas à notre base de données.", ephemeral: true });
            console.log(`❌ Utilisateur ${interaction.user.tag} (${userId}) a échoué à la vérification.`);

            // Log échoué dans le canal des logs
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
                logChannel.send(`❌ ${interaction.user.tag} a échoué à la vérification.`);
            }
        }
    } catch (error) {
        console.error("❌ Erreur lors de la vérification :", error);
        await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
    }
});

client.login(process.env.TOKEN).catch(error => {
    console.error('❌ Erreur lors de la connexion :', error);
});
