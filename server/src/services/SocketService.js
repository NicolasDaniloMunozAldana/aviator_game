import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { SOCKET_EVENTS } from '../utils/constants.js';
import gameService from './GameService.js';
import databaseService from './DatabaseService.js';
import authService from './AuthService.js';

export class SocketService {

    constructor() {
        this.io = null;
        this.redisClient = null;
        this.subClient = null;
    }

    async initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            allowEIO3: true,
            transports: ['websocket', 'polling']
        });

        const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();
        
        // Crear cliente adicional para sync del estado del juego
        this.redisClient = createClient({ url: redisUrl });
        this.subClient = createClient({ url: redisUrl });
        
        await pubClient.connect();
        await subClient.connect();
        await this.redisClient.connect();
        await this.subClient.connect();

        this.io.adapter(createAdapter(pubClient, subClient));

        // Inicializar servicios de base de datos
        await databaseService.initialize();

        // Configurar manejadores de eventos socket
        this.setupSocketHandlers();

        // Configurar sincronización con Redis
        this.setupRedisSync();

        // Pasar la referencia del socketService al gameService
        gameService.setSocketService(this);

        // Solo el líder arranca el loop principal del juego
        if (process.env.IS_LEADER === "true") {
            console.log("Soy líder, arrancando game loop...");
            await gameService.startGame();
        } else {
            console.log("Soy réplica, solo escucho eventos.");
            // Las réplicas se suscriben a las actualizaciones del estado
            this.subscribeToGameStateUpdates();
        }

        console.log('SocketService inicializado con Redis adapter y base de datos');
    }

    setupRedisSync() {
        if (process.env.IS_LEADER === "true") {
            // El líder publica actualizaciones del estado del juego
            gameService.onStateChange((gameState) => {
                this.publishGameState(gameState);
            });
        }
    }

    async publishGameState(gameState) {
        if (this.redisClient) {
            try {
                await this.redisClient.publish('game_state_sync', JSON.stringify({
                    type: 'game_state_update',
                    data: gameState,
                    timestamp: Date.now(),
                    leader: process.env.NAME || 'leader'
                }));
            } catch (error) {
                console.error('Error publicando estado del juego:', error);
            }
        }
    }

    async subscribeToGameStateUpdates() {
        if (this.subClient && process.env.IS_LEADER !== "true") {
            try {
                await this.subClient.subscribe('game_state_sync', (message) => {
                    try {
                        const syncData = JSON.parse(message);
                        
                        if (syncData.type === 'game_state_update') {
                            // Actualizar el estado local del gameService
                            gameService.syncGameState(syncData.data);
                            console.log(`Estado sincronizado desde líder ${syncData.leader}`);
                        }
                    } catch (error) {
                        console.error('Error procesando sincronización:', error);
                    }
                });
                
                console.log('Suscrito a actualizaciones del estado del juego');
            } catch (error) {
                console.error('Error suscribiéndose a Redis:', error);
            }
        }
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Usuario conectado en ${process.env.NAME || 'backend'}:`, socket.id);

            // Enviar estado actual del juego al conectar
            socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
            socket.emit(SOCKET_EVENTS.GAME_HISTORY, gameService.getGameHistory());

            // Evento de autenticación/conexión de jugador
            socket.on('authenticate', async (authData) => {
                try {
                    console.log('Intento de autenticación:', authData);
                    
                    const authResult = await authService.authenticateUser(
                        authData.username,
                        authData.userToken
                    );

                    if (authResult.success) {
                        // Asociar socket con jugador autenticado
                        authService.associateSocketWithPlayer(socket.id, authResult.player);

                        // Agregar jugador al juego si es líder
                        if (process.env.IS_LEADER === "true") {
                            gameService.playerJoin(socket.id, {
                                username: authResult.player.username,
                                balance: authResult.player.balance
                            });
                        } else {
                            // Las réplicas reenvían al líder
                            this.forwardToLeader('player_join', { 
                                socketId: socket.id, 
                                playerData: {
                                    username: authResult.player.username,
                                    balance: authResult.player.balance
                                }
                            });
                        }

                        // Enviar respuesta de autenticación exitosa
                        socket.emit('authenticated', {
                            success: true,
                            player: authResult.player.toJSON(),
                            userToken: authResult.userToken,
                            isNewUser: authResult.isNewUser
                        });

                        // Enviar estado actual del juego
                        socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                        socket.emit(SOCKET_EVENTS.GAME_HISTORY, gameService.getGameHistory());
                        
                        console.log(`Usuario autenticado: ${authResult.player.username} (${socket.id})`);
                    } else {
                        socket.emit('authentication_failed', {
                            success: false,
                            error: authResult.error
                        });
                    }
                } catch (error) {
                    console.error('Error en autenticación:', error);
                    socket.emit('authentication_failed', {
                        success: false,
                        error: 'Error del servidor'
                    });
                }
            });

            // Manejar eventos del cliente (mantener para compatibilidad)
            socket.on('player_join', async (playerData) => {
                console.log('Jugador se une (método legacy):', playerData);
                
                // Intentar autenticar si no está autenticado
                if (!authService.getPlayerBySocket(socket.id)) {
                    const authResult = await authService.authenticateUser(playerData.username);
                    if (authResult.success) {
                        authService.associateSocketWithPlayer(socket.id, authResult.player);
                    }
                }
                
                if (process.env.IS_LEADER === "true") {
                    // Solo el líder procesa las uniones de jugadores
                    gameService.playerJoin(socket.id, playerData);
                } else {
                    // Las réplicas reenvían al líder via Redis
                    this.forwardToLeader('player_join', { socketId: socket.id, playerData });
                }
                
                // Enviar estado actualizado inmediatamente
                socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
            });

            socket.on('place_bet', async (betData) => {
                console.log('Apuesta recibida:', betData);
                
                // Verificar que el jugador esté autenticado
                const player = authService.getPlayerBySocket(socket.id);
                if (!player) {
                    socket.emit('bet_result', { 
                        success: false, 
                        error: 'Debes iniciar sesión para apostar' 
                    });
                    return;
                }
                
                if (process.env.IS_LEADER === "true") {
                    // Solo el líder procesa las apuestas
                    const result = await gameService.placeBet(socket.id, betData);
                    socket.emit('bet_result', result);

                    if (result.success) {
                        this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                    }
                } else {
                    // Las réplicas reenvían al líder
                    this.forwardToLeader('place_bet', { socketId: socket.id, betData });
                }
            });

            socket.on('cash_out', async () => {
                console.log('Retiro solicitado por:', socket.id);
                
                // Verificar que el jugador esté autenticado
                const player = authService.getPlayerBySocket(socket.id);
                if (!player) {
                    socket.emit('cash_out_result', { 
                        success: false, 
                        error: 'Debes iniciar sesión para retirar' 
                    });
                    return;
                }
                
                if (process.env.IS_LEADER === "true") {
                    // Solo el líder procesa los retiros
                    const result = await gameService.cashOut(socket.id);
                    socket.emit('cash_out_result', result);

                    if (result.success) {
                        this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                    }
                } else {
                    // Las réplicas reenvían al líder
                    this.forwardToLeader('cash_out', { socketId: socket.id });
                }
            });

            socket.on('disconnect', () => {
                console.log('Usuario desconectado:', socket.id);
                
                // Remover sesión del jugador
                const player = authService.removeSocketSession(socket.id);
                
                if (process.env.IS_LEADER === "true") {
                    gameService.playerLeave(socket.id);
                    this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                } else {
                    this.forwardToLeader('player_leave', { socketId: socket.id });
                }
            });

            // Eventos adicionales para estadísticas de jugador
            socket.on('get_player_stats', async () => {
                const player = authService.getPlayerBySocket(socket.id);
                if (player) {
                    try {
                        const stats = await authService.getPlayerStats(player.id);
                        socket.emit('player_stats', stats);
                    } catch (error) {
                        console.error('Error obteniendo estadísticas:', error);
                        socket.emit('player_stats', { error: 'Error obteniendo estadísticas' });
                    }
                }
            });
        });
    }

    async forwardToLeader(action, data) {
        if (this.redisClient) {
            try {
                await this.redisClient.publish('leader_commands', JSON.stringify({
                    action,
                    data,
                    source: process.env.NAME || 'replica',
                    timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Error enviando comando al líder:', error);
            }
        }
    }

    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}

export default new SocketService();
