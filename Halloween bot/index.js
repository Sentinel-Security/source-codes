const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuración
const TOKEN = 'TU_TOKEN_AQUÍ';
const CLIENT_ID = 'TU_CLIENT_ID_AQUÍ';

// Ruta del archivo JSON
const dataPath = path.join(__dirname, 'candies.json');

// Función para leer datos
function readData() {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { servers: {} };
    }
}

// Función para guardar datos
function saveData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Crear cliente
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Definir comandos
const commands = [
    new SlashCommandBuilder()
        .setName('add')
        .setDescription('🎃 Agrega dulces de Halloween')
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Número de dulces a agregar')
                .setRequired(true)
                .setMinValue(1))
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario al que darle dulces (opcional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('🎃 Quita dulces de Halloween')
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Número de dulces a quitar')
                .setRequired(true)
                .setMinValue(1))
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario al que quitarle dulces (opcional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    new SlashCommandBuilder()
        .setName('see')
        .setDescription('👻 Ver el total de dulces recolectados en este servidor')
].map(command => command.toJSON());

// Registrar comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🎃 Registrando comandos de Halloween...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Comandos registrados exitosamente!');
    } catch (error) {
        console.error('❌ Error al registrar comandos:', error);
    }
})();

// Evento: Bot listo
client.once('ready', () => {
    console.log(`🎃 Bot de Halloween listo! Conectado como ${client.user.tag}`);
});

// Evento: Interacciones
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const guildId = interaction.guild.id;

    if (commandName === 'add') {
        const cantidad = interaction.options.getInteger('cantidad');
        const targetUser = interaction.options.getUser('usuario');
        
        const userId = targetUser ? targetUser.id : interaction.user.id;
        const username = targetUser ? targetUser.username : interaction.user.username;
        const giver = interaction.user.username;

        // Leer datos actuales
        const data = readData();
        
        // Inicializar servidor si no existe
        if (!data.servers[guildId]) {
            data.servers[guildId] = { candies: {} };
        }
        
        // Agregar dulces al usuario en este servidor
        if (!data.servers[guildId].candies[userId]) {
            data.servers[guildId].candies[userId] = {
                username: username,
                total: 0
            };
        }
        
        data.servers[guildId].candies[userId].total += cantidad;
        data.servers[guildId].candies[userId].username = username;
        
        // Guardar datos
        saveData(data);

        if (targetUser) {
            await interaction.reply({
                content: `🍬 **${giver}** le dio **${cantidad}** dulces a **${username}**! 🎃\nTotal de ${username}: **${data.servers[guildId].candies[userId].total}** dulces 👻`,
                ephemeral: false
            });
        } else {
            await interaction.reply({
                content: `🍬 **${username}** agregó **${cantidad}** dulces! 🎃\nTotal acumulado: **${data.servers[guildId].candies[userId].total}** dulces 👻`,
                ephemeral: false
            });
        }

    } else if (commandName === 'remove') {
        const cantidad = interaction.options.getInteger('cantidad');
        const targetUser = interaction.options.getUser('usuario');
        
        const userId = targetUser ? targetUser.id : interaction.user.id;
        const username = targetUser ? targetUser.username : interaction.user.username;
        const remover = interaction.user.username;

        // Leer datos actuales
        const data = readData();
        
        // Verificar si el servidor existe
        if (!data.servers[guildId] || !data.servers[guildId].candies[userId]) {
            await interaction.reply({
                content: `❌ **${username}** no tiene dulces registrados en este servidor! 👻`,
                ephemeral: true
            });
            return;
        }
        
        // Quitar dulces (no puede ser negativo)
        const currentTotal = data.servers[guildId].candies[userId].total;
        data.servers[guildId].candies[userId].total = Math.max(0, currentTotal - cantidad);
        
        // Guardar datos
        saveData(data);

        const newTotal = data.servers[guildId].candies[userId].total;

        if (targetUser) {
            await interaction.reply({
                content: `🎃 **${remover}** le quitó **${cantidad}** dulces a **${username}**! 👻\nTotal de ${username}: **${newTotal}** dulces`,
                ephemeral: false
            });
        } else {
            await interaction.reply({
                content: `🎃 **${username}** perdió **${cantidad}** dulces! 👻\nTotal restante: **${newTotal}** dulces`,
                ephemeral: false
            });
        }

    } else if (commandName === 'see') {
        const data = readData();
        
        // Verificar si hay datos en este servidor
        if (!data.servers[guildId] || Object.keys(data.servers[guildId].candies).length === 0) {
            await interaction.reply({
                content: '👻 Aún no hay dulces recolectados en este servidor... ¡Sal a hacer truco o trato! 🎃',
                ephemeral: true
            });
            return;
        }

        // Ordenar usuarios por cantidad de dulces
        const sorted = Object.entries(data.servers[guildId].candies)
            .sort((a, b) => b[1].total - a[1].total);

        // Calcular total general del servidor
        const totalGeneral = sorted.reduce((sum, [, user]) => sum + user.total, 0);

        // Crear descripción del embed
        let descripcion = '';
        sorted.forEach(([userId, user], index) => {
            const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🍬';
            descripcion += `${medalla} **${user.username}**: ${user.total} dulces\n`;
        });

        // Crear embed
        const embed = {
            color: 0xFF6600,
            title: '🎃 DULCES DE HALLOWEEN 🎃',
            description: descripcion,
            thumbnail: {
                url: 'https://i.imgur.com/z6VIY1h.gif'
            },
            fields: [
                {
                    name: '👻 Total del Servidor',
                    value: `🍭 **${totalGeneral}** dulces recolectados`,
                    inline: false
                }
            ],
            footer: {
                text: '¡Feliz Halloween! 🎃',
            },
            timestamp: new Date().toISOString()
        };

        await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });
    }
});

// Iniciar bot
client.login(TOKEN);
