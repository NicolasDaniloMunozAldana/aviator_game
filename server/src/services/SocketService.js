import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { SOCKET_EVENTS } from '../utils/constants.js';
import gameService from './GameService.js';

export class SocketService {

    constructor() {
        this.io = null;
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
        await pubClient.connect();
        await subClient.connect();

        this.io.adapter(createAdapter(pubClient, subClient));



        this.setupSocketHandlers();
        gameService.setSocketService(this);
        gameService.startGame();

        console.log('SocketService inicializado con Redis adapter');
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
                gameService.playerJoin(socket.id, playerData);
                // Enviar estado actualizado inmediatamente
                socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
            });

            socket.on('place_bet', (betData) => {
                console.log('Apuesta recibida:', betData);
                const result = gameService.placeBet(socket.id, betData);
                socket.emit('bet_result', result);

                // Si la apuesta fue exitosa, emitir actualización a todos
                if (result.success) {
                    this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                }
            });

            socket.on('cash_out', () => {
                console.log('Retiro solicitado por:', socket.id);
                const result = gameService.cashOut(socket.id);
                socket.emit('cash_out_result', result);

                // Si el retiro fue exitoso, emitir actualización a todos
                if (result.success) {
                    this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
                }
            });

            socket.on('disconnect', () => {
                console.log('Usuario desconectado:', socket.id);
                gameService.playerLeave(socket.id);
                // Emitir actualización del estado tras desconexión
                this.broadcast(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
            });
        });
    }

    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}

export default new SocketService();
