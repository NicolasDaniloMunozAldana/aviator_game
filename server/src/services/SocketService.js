import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { SOCKET_EVENTS } from '../utils/constants.js';
import gameService from './GameService.js';

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

        // Configurar manejadores de eventos socket
        this.setupSocketHandlers();

        // Configurar sincronización con Redis
        this.setupRedisSync();

        // Pasar la referencia del socketService al gameService
        gameService.setSocketService(this);

        // Solo el líder arranca el loop principal del juego
        if (process.env.IS_LEADER === "true") {
            console.log("Soy líder, arrancando game loop...");
            gameService.startGame();
        } else {
            console.log("Soy réplica, solo escucho eventos.");
            // Las réplicas se suscriben a las actualizaciones del estado
            this.subscribeToGameStateUpdates();
        }

        console.log('SocketService inicializado con Redis adapter');
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

            // Manejar eventos del cliente
            socket.on('player_join', (playerData) => {
                console.log('Jugador se une:', playerData);
                
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

            socket.on('place_bet', (betData) => {
                console.log('Apuesta recibida:', betData);
                
                if (process.env.IS_LEADER === "true") {
                    // Solo el líder procesa las apuestas
                    const result = gameService.placeBet(socket.id, betData);
                    socket.emit('bet_result', result);

                    if (result.success) {
                        this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                    }
                } else {
                    // Las réplicas reenvían al líder
                    this.forwardToLeader('place_bet', { socketId: socket.id, betData });
                }
            });

            socket.on('cash_out', () => {
                console.log('Retiro solicitado por:', socket.id);
                
                if (process.env.IS_LEADER === "true") {
                    // Solo el líder procesa los retiros
                    const result = gameService.cashOut(socket.id);
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
                
                if (process.env.IS_LEADER === "true") {
                    gameService.playerLeave(socket.id);
                    this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                } else {
                    this.forwardToLeader('player_leave', { socketId: socket.id });
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
