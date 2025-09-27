import {Server} from 'socket.io';
import { SOCKET_EVENTS } from '../utils/constants.js';
import gameService from './GameService.js';

export class SocketService {

    constructor() {
        this.io = null;
        this.redisClient = null;
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.setupSocketHandlers();
        gameService.setSocketService(this);
        gameService.startGame();

        console.log('SocketService inicializado');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Usuario conectado:', socket.id);

            // Enviar estado actual del juego al conectar
            socket.emit(SOCKET_EVENTS.GAME_STATE_UPDATE, gameService.getGameState());
            socket.emit(SOCKET_EVENTS.GAME_HISTORY, gameService.getGameHistory());

            // Manejar eventos del cliente
            socket.on('player_join', (playerData) => {
                gameService.playerJoin(socket.id, playerData);
            });

            socket.on('place_bet', (betData) => {
                const result = gameService.placeBet(socket.id, betData);
                socket.emit('bet_result', result);
            });

            socket.on('cash_out', () => {
                const result = gameService.cashOut(socket.id);
                socket.emit('cash_out_result', result);
            });

            socket.on('disconnect', () => {
                console.log('Usuario desconectado:', socket.id);
                gameService.playerLeave(socket.id);
            });
        });
    }

    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    emitToRoom(room, event, data) {
        if (this.io) {
            this.io.to(room).emit(event, data);
        }
    }
}

export default new SocketService();
