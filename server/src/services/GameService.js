import { GameEngine } from "../core/GameEngine.js";
import { SOCKET_EVENTS } from "../utils/constants.js";

export class GameService {
    constructor() {
        this.gameEngine = new GameEngine;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Escuchar eventos del motor del juego y redirigir a sockets
        this.gameEngine.on('gameStateUpdate', (gameState) => {
            this.emitToSockets(SOCKET_EVENTS.GAME_STATE_UPDATE, gameState);
        });

        this.gameEngine.on('multiplierUpdate', (data) => {
            this.emitToSockets(SOCKET_EVENTS.MULTIPLIER_UPDATE, data);
        });

        this.gameEngine.on('betPlaced', (betData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_BET, betData);
        });

        this.gameEngine.on('cashOut', (cashOutData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_CASH_OUT, cashOutData);
        });

        this.gameEngine.on('playerJoined', (playerData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_JOINED, playerData);
        });

        this.gameEngine.on('playerLeft', (playerData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_LEFT, playerData);
        });

        this.gameEngine.on('roundComplete', (roundData) => {
            this.emitToSockets('round_complete', roundData);
        });
    }

    setSocketService(socketService) {
        this.socketService = socketService;
    }

    emitToSockets(event, data) {
        if (this.socketService) {
            this.socketService.broadcast(event, data);
        }
    }

    startGame() {
        this.gameEngine.start();
    }

    placeBet(playerId, betData) {
        return this.gameEngine.placeBet(playerId, betData);
    }

    cashOut(playerId) {
        return this.gameEngine.cashOut(playerId);
    }

    playerJoin(playerId, playerData) {
        this.gameEngine.playerJoin(playerId, playerData);
    }

    playerLeave(playerId) {
        this.gameEngine.playerLeave(playerId);
    }

    getGameState() {
        return this.gameEngine.getGameState();
    }

    getGameHistory() {
        return this.gameEngine.getGameHistory();
    }
}

export default new GameService();
