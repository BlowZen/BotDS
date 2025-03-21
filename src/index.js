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
const CHANNEL_ID = '1352270110483808391'; // ID du canal de vérification

client.once('ready', async () => {
    console.log('✅ Bot is online!');

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Le canal spécifié est introuvable.");

    // 🧹 Suppression des anciens messages du salon
    try {
        const messages = await channel.messages.fetch();
        await channel.bulkDelete(messages);
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

    const channel = await member.guild.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Le canal de vérification est introuvable !");

    const role = member.guild.roles.cache.get(ROLE_ID);
    if (!role) return console.error("❌ Le rôle de vérification n'existe pas !");

    // 🔄 Vérification si l'ID est dans la base Google Sheets
    const sheetIDs = await getDiscordIDs();
    if (!sheetIDs.includes(member.id)) {
        try {
            await channel.send({
                content: `👋 ${member}, vous devez vérifier votre compte en cliquant sur le bouton ci-dessus.`,
                ephemeral: true // 👀 Ce message est **visible uniquement par la personne non vérifiée**
            });
            console.log(`📩 Message temporaire envoyé à ${member.user.tag} dans le salon.`);
        } catch (error) {
            console.error(`❌ Impossible d'envoyer le message temporaire à ${member.user.tag} :`, error);
        }
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "verify") return;

    const role = interaction.guild.roles.cache.get(ROLE_ID);
    if (!role) return interaction.reply({ content: "❌ Le rôle n'existe pas !", ephemeral: true });

    try {
        const userId = interaction.user.id;

        // 🔄 Récupération des IDs depuis Google Sheets
        const sheetIDs = await getDiscordIDs();
        console.log(`📜 IDs récupérés de Google Sheets :`, sheetIDs);

        if (sheetIDs.includes(userId)) {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: "✅ Vous avez été vérifié avec succès !", ephemeral: true });
            console.log(`✔️ Utilisateur ${interaction.user.tag} (${userId}) vérifié.`);
        } else {
            await interaction.reply({ content: "❌ Votre ID ne correspond pas à notre base de données.", ephemeral: true });
            console.log(`❌ Utilisateur ${interaction.user.tag} (${userId}) a échoué à la vérification.`);
        }
    } catch (error) {
        console.error("❌ Erreur lors de la vérification :", error);
        await interaction.reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
    }
});

client.login(process.env.TOKEN).catch(error => {
    console.error('❌ Erreur lors de la connexion :', error);
});
