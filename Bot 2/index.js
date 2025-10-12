const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const configs = new Map();
const games = new Map();

function loadConfigs() {
    try {
        const data = fs.readFileSync('./configs.json', 'utf8');
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([key, value]) => {
            configs.set(key, value);
        });
    } catch (error) {
        console.log('No se encontró archivo de configuración, creando uno nuevo...');
    }
}

function saveConfigs() {
    const obj = Object.fromEntries(configs);
    fs.writeFileSync('./configs.json', JSON.stringify(obj, null, 2));
}

loadConfigs();

client.commands = new Collection();

const commands = [
    {
        name: 'setup',
        description: 'Configurar minijuegos del servidor'
    },
    {
        name: 'config',
        description: 'Configurar filtro de palabras y sistema de tickets',
        default_member_permissions: PermissionFlagsBits.ManageChannels.toString()
    }
];

client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Comandos registrados globalmente');
    } catch (error) {
        console.error('Error registrando comandos:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'setup') {
        const embed = new EmbedBuilder()
            .setTitle('🎮 Minijuegos Disponibles')
            .setDescription('Selecciona un minijuego para comenzar:')
            .setColor('#00ff00');
        
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_game')
                    .setPlaceholder('Selecciona un minijuego')
                    .addOptions([
                        {
                            label: 'Tic Tac Toe',
                            description: 'Juega tres en raya',
                            value: 'tictactoe',
                            emoji: '❌'
                        },
                        {
                            label: 'Wordle',
                            description: 'Adivina la palabra de 5 letras',
                            value: 'wordle',
                            emoji: '📝'
                        },
                        {
                            label: 'Quiz',
                            description: 'Responde preguntas de trivia',
                            value: 'quiz',
                            emoji: '❓'
                        },
                        {
                            label: 'Ruleta Rusa',
                            description: 'Juego de supervivencia grupal',
                            value: 'roulette',
                            emoji: '🔫'
                        },
                        {
                            label: 'Número Aleatorio',
                            description: 'Adivina el número del 1 al 500',
                            value: 'number',
                            emoji: '🔢'
                        },
                        {
                            label: 'Flip Coin',
                            description: 'Lanza una moneda',
                            value: 'coin',
                            emoji: '🪙'
                        }
                    ])
            );
        
        await interaction.reply({ embeds: [embed], components: [row] });
    }
    
    if (interaction.commandName === 'config') {
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración del Servidor')
            .setDescription('Configura el sistema de moderación')
            .setColor('#ff9900');
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('config_badwords')
                    .setLabel('Palabras Prohibidas')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚫'),
                new ButtonBuilder()
                    .setCustomId('config_ticket_roles')
                    .setLabel('Roles de Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫'),
                new ButtonBuilder()
                    .setCustomId('config_bypass_role')
                    .setLabel('Rol de Bypass')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    
    if (interaction.customId === 'select_game') {
        const game = interaction.values[0];
        
        switch(game) {
            case 'tictactoe':
                await startTicTacToe(interaction);
                break;
            case 'wordle':
                await startWordle(interaction);
                break;
            case 'quiz':
                await startQuiz(interaction);
                break;
            case 'roulette':
                await startRussianRoulette(interaction);
                break;
            case 'number':
                await startNumberGuess(interaction);
                break;
            case 'coin':
                await flipCoin(interaction);
                break;
        }
    }
});

async function startTicTacToe(interaction) {
    const gameId = `ttt_${interaction.user.id}_${Date.now()}`;
    const board = ['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'];
    
    games.set(gameId, {
        board,
        currentPlayer: '❌',
        players: [interaction.user.id]
    });
    
    const embed = new EmbedBuilder()
        .setTitle('❌ Tic Tac Toe ⭕')
        .setDescription(`Turno de: ${interaction.user}\n\n${formatBoard(board)}`)
        .setColor('#00ff00');
    
    const rows = createTicTacToeButtons(gameId);
    
    await interaction.update({ embeds: [embed], components: rows });
}

function formatBoard(board) {
    return `${board[0]} ${board[1]} ${board[2]}\n${board[3]} ${board[4]} ${board[5]}\n${board[6]} ${board[7]} ${board[8]}`;
}

function createTicTacToeButtons(gameId) {
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${gameId}_${index}`)
                    .setLabel('​')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        rows.push(row);
    }
    return rows;
}

async function startWordle(interaction) {
    const words = ['GATOS', 'PERRO', 'MUNDO', 'CIELO', 'LIBRO', 'PLAZA', 'FUEGO', 'NOCHE', 'TARDE'];
    const word = words[Math.floor(Math.random() * words.length)];
    const gameId = `wordle_${interaction.user.id}_${Date.now()}`;
    
    games.set(gameId, {
        word,
        attempts: [],
        maxAttempts: 6
    });
    
    const embed = new EmbedBuilder()
        .setTitle('📝 Wordle')
        .setDescription('Adivina la palabra de 5 letras!\n\n🟩 = Letra correcta en posición correcta\n🟨 = Letra correcta en posición incorrecta\n⬜ = Letra no está en la palabra\n\nEscribe tu intento en el chat.')
        .addFields({ name: 'Intentos restantes', value: '6/6' })
        .setColor('#ffff00');
    
    await interaction.update({ embeds: [embed], components: [] });
}

async function startQuiz(interaction) {
    const questions = [
        {
            question: '¿Cuál es la capital de Francia?',
            options: ['Madrid', 'París', 'Londres', 'Berlín'],
            correct: 1
        },
        {
            question: '¿Cuántos planetas hay en el sistema solar?',
            options: ['7', '8', '9', '10'],
            correct: 1
        },
        {
            question: '¿En qué año llegó el hombre a la Luna?',
            options: ['1965', '1969', '1972', '1975'],
            correct: 1
        }
    ];
    
    const question = questions[Math.floor(Math.random() * questions.length)];
    const gameId = `quiz_${interaction.user.id}_${Date.now()}`;
    
    games.set(gameId, question);
    
    const embed = new EmbedBuilder()
        .setTitle('❓ Quiz')
        .setDescription(question.question)
        .setColor('#0099ff');
    
    const row = new ActionRowBuilder();
    question.options.forEach((option, index) => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`quiz_${gameId}_${index}`)
                .setLabel(option)
                .setStyle(ButtonStyle.Primary)
        );
    });
    
    await interaction.update({ embeds: [embed], components: [row] });
}

async function startRussianRoulette(interaction) {
    const gameId = `roulette_${interaction.channel.id}_${Date.now()}`;
    
    games.set(gameId, {
        players: [],
        started: false,
        bulletPosition: Math.floor(Math.random() * 6)
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🔫 Ruleta Rusa')
        .setDescription('¡Únete al juego!\n\nJugadores: 0\n\n⚠️ El juego comenzará cuando haya al menos 2 jugadores.')
        .setColor('#ff0000');
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`roulette_join_${gameId}`)
                .setLabel('Unirse')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`roulette_start_${gameId}`)
                .setLabel('Comenzar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔫')
        );
    
    await interaction.update({ embeds: [embed], components: [row] });
}

async function startNumberGuess(interaction) {
    const number = Math.floor(Math.random() * 500) + 1;
    const gameId = `number_${interaction.user.id}_${Date.now()}`;
    
    games.set(gameId, {
        number,
        attempts: 0
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🔢 Adivina el Número')
        .setDescription('He elegido un número entre 1 y 500.\n\nEscribe tu intento en el chat!')
        .addFields({ name: 'Intentos', value: '0' })
        .setColor('#9900ff');
    
    await interaction.update({ embeds: [embed], components: [] });
}

async function flipCoin(interaction) {
    const result = Math.random() < 0.5 ? 'Cara' : 'Cruz';
    const emoji = result === 'Cara' ? '🟡' : '⚪';
    
    const embed = new EmbedBuilder()
        .setTitle('🪙 Lanzamiento de Moneda')
        .setDescription(`${emoji} ¡Salió **${result}**!`)
        .setColor(result === 'Cara' ? '#ffff00' : '#ffffff');
    
    await interaction.update({ embeds: [embed], components: [] });
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === 'config_badwords') {
        const modal = new ModalBuilder()
            .setCustomId('modal_badwords')
            .setTitle('Configurar Palabras Prohibidas');
        
        const input = new TextInputBuilder()
            .setCustomId('badwords_input')
            .setLabel('Palabras prohibidas (separadas por comas)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('mierda, tonto, idiota')
            .setRequired(true);
        
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    
    if (interaction.customId === 'config_ticket_roles') {
        const modal = new ModalBuilder()
            .setCustomId('modal_ticket_roles')
            .setTitle('Configurar Roles de Ticket');
        
        const input = new TextInputBuilder()
            .setCustomId('ticket_roles_input')
            .setLabel('IDs de roles (separados por comas)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('123456789, 987654321')
            .setRequired(true);
        
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    
    if (interaction.customId === 'config_bypass_role') {
        const modal = new ModalBuilder()
            .setCustomId('modal_bypass_role')
            .setTitle('Configurar Rol de Bypass');
        
        const input = new TextInputBuilder()
            .setCustomId('bypass_role_input')
            .setLabel('ID del rol que puede usar palabras prohibidas')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('123456789012345678')
            .setRequired(true);
        
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    
    if (interaction.customId.startsWith('ttt_ttt_')) {
        await handleTicTacToeMove(interaction);
    }
    
    if (interaction.customId.startsWith('quiz_quiz_')) {
        await handleQuizAnswer(interaction);
    }
    
    if (interaction.customId.startsWith('roulette_join_')) {
        await handleRouletteJoin(interaction);
    }
    
    if (interaction.customId.startsWith('roulette_start_')) {
        await handleRouletteStart(interaction);
    }
    
    if (interaction.customId.startsWith('close_ticket_')) {
        await handleCloseTicket(interaction);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;
    
    if (interaction.customId === 'modal_badwords') {
        const words = interaction.fields.getTextInputValue('badwords_input')
            .split(',')
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 0);
        
        const guildConfig = configs.get(interaction.guildId) || {};
        guildConfig.badWords = words;
        configs.set(interaction.guildId, guildConfig);
        saveConfigs();
        
        await interaction.reply({ content: `✅ Se han configurado ${words.length} palabras prohibidas.`, ephemeral: true });
    }
    
    if (interaction.customId === 'modal_ticket_roles') {
        const roles = interaction.fields.getTextInputValue('ticket_roles_input')
            .split(',')
            .map(r => r.trim())
            .filter(r => r.length > 0);
        
        const guildConfig = configs.get(interaction.guildId) || {};
        guildConfig.ticketRoles = roles;
        configs.set(interaction.guildId, guildConfig);
        saveConfigs();
        
        await interaction.reply({ content: `✅ Se han configurado ${roles.length} roles para los tickets.`, ephemeral: true });
    }
    
    if (interaction.customId === 'modal_bypass_role') {
        const roleId = interaction.fields.getTextInputValue('bypass_role_input').trim();
        
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            return await interaction.reply({ content: '❌ No se encontró un rol con ese ID. Asegúrate de copiar el ID correcto.', ephemeral: true });
        }
        
        const guildConfig = configs.get(interaction.guildId) || {};
        guildConfig.bypassRole = roleId;
        configs.set(interaction.guildId, guildConfig);
        saveConfigs();
        
        await interaction.reply({ content: `✅ El rol **${role.name}** ahora puede usar palabras prohibidas sin restricciones.`, ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    
    const guildConfig = configs.get(message.guildId);
    if (!guildConfig || !guildConfig.badWords) return;
    
    if (guildConfig.bypassRole && message.member.roles.cache.has(guildConfig.bypassRole)) {
        return;
    }
    
    const content = message.content.toLowerCase();
    const hasBadWord = guildConfig.badWords.some(word => content.includes(word));
    
    if (hasBadWord) {
        await message.delete();
        await createTicketForUser(message);
    }
});

async function createTicketForUser(message) {
    const guild = message.guild;
    const member = message.member;
    const guildConfig = configs.get(guild.id) || {};
    
    let appealRole = guild.roles.cache.find(r => r.name === 'En apelación');
    if (!appealRole) {
        appealRole = await guild.roles.create({
            name: 'En apelación',
            color: '#ff0000',
            reason: 'Sistema de tickets automático'
        });
        
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel.isTextBased() || channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildCategory) {
                try {
                    await channel.permissionOverwrites.create(appealRole, {
                        ViewChannel: false,
                        SendMessages: false,
                        Connect: false
                    }, { reason: 'Configuración automática de rol de apelación' });
                } catch (error) {
                    console.error(`Error configurando permisos en canal ${channel.name}:`, error);
                }
            }
        }
    }
    
    await member.roles.add(appealRole);
    
    const ticketChannel = await guild.channels.create({
        name: `ticket-${member.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: appealRole.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: member.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            },
            ...(guildConfig.ticketRoles || []).map(roleId => ({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory]
            }))
        ]
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket de Moderación')
        .setDescription(`${member} ha usado una palabra prohibida.\n\n**Mensaje:** ${message.content}\n\nUn moderador revisará tu caso pronto.`)
        .setColor('#ff0000')
        .setTimestamp();
    
    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`close_ticket_${member.id}`)
                .setLabel('Cerrar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );
    
    await ticketChannel.send({ content: `${member}`, embeds: [embed], components: [closeButton] });
}

async function handleTicTacToeMove(interaction) {
    const parts = interaction.customId.split('_');
    const gameId = `${parts[1]}_${parts[2]}_${parts[3]}`;
    const position = parseInt(parts[4]);
    
    const game = games.get(gameId);
    if (!game || game.board[position] !== '⬜') {
        return await interaction.reply({ content: '❌ Movimiento inválido', ephemeral: true });
    }
    
    game.board[position] = game.currentPlayer;
    
    const winner = checkWinner(game.board);
    if (winner) {
        const embed = new EmbedBuilder()
            .setTitle('🎉 ¡Juego Terminado!')
            .setDescription(`${formatBoard(game.board)}\n\n**${winner === 'empate' ? 'Empate!' : `Ganador: ${winner}`}**`)
            .setColor(winner === 'empate' ? '#ffff00' : '#00ff00');
        
        games.delete(gameId);
        return await interaction.update({ embeds: [embed], components: [] });
    }
    
    game.currentPlayer = game.currentPlayer === '❌' ? '⭕' : '❌';
    
    const embed = new EmbedBuilder()
        .setTitle('❌ Tic Tac Toe ⭕')
        .setDescription(`Turno de: ${game.currentPlayer}\n\n${formatBoard(game.board)}`)
        .setColor('#00ff00');
    
    const rows = createTicTacToeButtons(gameId);
    await interaction.update({ embeds: [embed], components: rows });
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
        if (board[a] !== '⬜' && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    if (!board.includes('⬜')) return 'empate';
    return null;
}

async function handleQuizAnswer(interaction) {
    const parts = interaction.customId.split('_');
    const gameId = `${parts[1]}_${parts[2]}_${parts[3]}`;
    const answer = parseInt(parts[4]);
    
    const question = games.get(gameId);
    if (!question) return;
    
    const correct = answer === question.correct;
    
    const embed = new EmbedBuilder()
        .setTitle(correct ? '✅ ¡Correcto!' : '❌ Incorrecto')
        .setDescription(correct ? 
            '¡Bien hecho! Respuesta correcta.' : 
            `La respuesta correcta era: **${question.options[question.correct]}**`)
        .setColor(correct ? '#00ff00' : '#ff0000');
    
    games.delete(gameId);
    await interaction.update({ embeds: [embed], components: [] });
}

async function handleRouletteJoin(interaction) {
    const gameId = interaction.customId.replace('roulette_join_', '');
    const game = games.get(gameId);
    
    if (!game) return;
    if (game.players.includes(interaction.user.id)) {
        return await interaction.reply({ content: '❌ Ya estás en el juego', ephemeral: true });
    }
    
    game.players.push(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🔫 Ruleta Rusa')
        .setDescription(`¡Únete al juego!\n\nJugadores: ${game.players.length}\n${game.players.map(id => `<@${id}>`).join('\n')}`)
        .setColor('#ff0000');
    
    await interaction.update({ embeds: [embed] });
    await interaction.followUp({ content: '✅ Te has unido al juego', ephemeral: true });
}

async function handleRouletteStart(interaction) {
    const gameId = interaction.customId.replace('roulette_start_', '');
    const game = games.get(gameId);
    
    if (!game || game.players.length < 2) {
        return await interaction.reply({ content: '❌ Se necesitan al menos 2 jugadores', ephemeral: true });
    }
    
    const eliminated = game.players[game.bulletPosition % game.players.length];
    
    const embed = new EmbedBuilder()
        .setTitle('💥 ¡BANG!')
        .setDescription(`<@${eliminated}> ha sido eliminado!\n\n**Sobrevivientes:**\n${game.players.filter(id => id !== eliminated).map(id => `<@${id}>`).join('\n')}`)
        .setColor('#ff0000');
    
    games.delete(gameId);
    await interaction.update({ embeds: [embed], components: [] });
}

async function handleCloseTicket(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return await interaction.reply({ content: '❌ No tienes permiso para cerrar tickets.', ephemeral: true });
    }
    
    const userId = interaction.customId.replace('close_ticket_', '');
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    
    if (member) {
        const appealRole = interaction.guild.roles.cache.find(r => r.name === 'En apelación');
        if (appealRole && member.roles.cache.has(appealRole.id)) {
            await member.roles.remove(appealRole);
        }
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🔒 Ticket Cerrado')
        .setDescription(`Ticket cerrado por ${interaction.user}\n\nEste canal será eliminado en 5 segundos...`)
        .setColor('#ff0000')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    setTimeout(async () => {
        await interaction.channel.delete('Ticket cerrado por moderador');
    }, 5000);
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    const wordleGame = Array.from(games.entries()).find(([key, value]) => 
        key.startsWith(`wordle_${message.author.id}`) && value.word
    );
    
    if (wordleGame && message.content.length === 5) {
        const [gameId, game] = wordleGame;
        const guess = message.content.toUpperCase();
        
        if (!/^[A-Z]{5}$/.test(guess)) return;
        
        game.attempts.push(guess);
        
        let result = '';
        for (let i = 0; i < 5; i++) {
            if (guess[i] === game.word[i]) {
                result += '🟩';
            } else if (game.word.includes(guess[i])) {
                result += '🟨';
            } else {
                result += '⬜';
            }
        }
        
        const attemptsLeft = game.maxAttempts - game.attempts.length;
        
        if (guess === game.word) {
            const embed = new EmbedBuilder()
                .setTitle('🎉 ¡Ganaste!')
                .setDescription(`La palabra era: **${game.word}**\nIntentos usados: ${game.attempts.length}`)
                .setColor('#00ff00');
            
            await message.reply({ embeds: [embed] });
            games.delete(gameId);
        } else if (attemptsLeft === 0) {
            const embed = new EmbedBuilder()
                .setTitle('😢 Perdiste')
                .setDescription(`La palabra era: **${game.word}**`)
                .setColor('#ff0000');
            
            await message.reply({ embeds: [embed] });
            games.delete(gameId);
        } else {
            await message.reply(`${result}\nIntentos restantes: ${attemptsLeft}`);
        }
    }
    
    const numberGame = Array.from(games.entries()).find(([key, value]) => 
        key.startsWith(`number_${message.author.id}`) && value.number
    );
    
    if (numberGame) {
        const [gameId, game] = numberGame;
        const guess = parseInt(message.content);
        
        if (isNaN(guess) || guess < 1 || guess > 500) return;
        
        game.attempts++;
        
        if (guess === game.number) {
            const embed = new EmbedBuilder()
                .setTitle('🎉 ¡Correcto!')
                .setDescription(`El número era **${game.number}**\nIntentos: ${game.attempts}`)
                .setColor('#00ff00');
            
            await message.reply({ embeds: [embed] });
            games.delete(gameId);
        } else {
            const hint = guess < game.number ? 'mayor' : 'menor';
            await message.reply(`❌ Incorrecto. El número es **${hint}**. Intentos: ${game.attempts}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
