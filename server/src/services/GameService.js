import { GameEngine } from "../core/GameEngine.js";
import { SOCKET_EVENTS } from "../utils/constants.js";

export class GameService {
    constructor() {
        this.gameEngine = new GameEngine();
        this.socketService = null;
        this.stateChangeCallbacks = [];
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Escuchar eventos del motor del juego y redirigir a sockets
        this.gameEngine.on('gameStateUpdate', (gameState) => {
            this.emitToSockets(SOCKET_EVENTS.GAME_STATE_UPDATE, gameState);
            // Notificar cambios de estado para sincronización
            this.notifyStateChange(gameState);
        });

        this.gameEngine.on('multiplierUpdate', (data) => {
            this.emitToSockets(SOCKET_EVENTS.MULTIPLIER_UPDATE, data);
        });

        this.gameEngine.on('betPlaced', (betData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_BET, betData);
            // Sincronizar estado tras apuesta
            this.notifyStateChange(this.gameEngine.getGameState());
        });

        this.gameEngine.on('cashOut', (cashOutData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_CASH_OUT, cashOutData);
            // Sincronizar estado tras retiro
            this.notifyStateChange(this.gameEngine.getGameState());
        });

        this.gameEngine.on('playerJoined', (playerData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_JOINED, playerData);
            // Sincronizar estado tras unión de jugador
            this.notifyStateChange(this.gameEngine.getGameState());
        });

        this.gameEngine.on('playerLeft', (playerData) => {
            this.emitToSockets(SOCKET_EVENTS.PLAYER_LEFT, playerData);
            // Sincronizar estado tras salida de jugador
            this.notifyStateChange(this.gameEngine.getGameState());
        });

        this.gameEngine.on('roundComplete', (roundData) => {
            this.emitToSockets(SOCKET_EVENTS.ROUND_COMPLETE, roundData);
            // Sincronizar estado tras completar ronda
            this.notifyStateChange(this.gameEngine.getGameState());
        });

        this.gameEngine.on('waitingCountdown', (data) => {
            this.emitToSockets(SOCKET_EVENTS.WAITING_COUNTDOWN, data);
        });
    }

    // Método para registrar callbacks de cambio de estado
    onStateChange(callback) {
        this.stateChangeCallbacks.push(callback);
    }

    // Notificar a todos los callbacks sobre cambio de estado
    notifyStateChange(gameState) {
        this.stateChangeCallbacks.forEach(callback => {
            try {
                callback(gameState);
            } catch (error) {
                console.error('Error en callback de cambio de estado:', error);
            }
        });
    }

    // Método para sincronizar estado desde Redis (para réplicas)
    syncGameState(gameState) {
        try {
            // Actualizar el estado interno del game engine
            this.gameEngine.gameState.currentState = gameState.currentState;
            this.gameEngine.gameState.currentMultiplier = gameState.currentMultiplier;
            this.gameEngine.gameState.roundNumber = gameState.roundNumber;
            this.gameEngine.gameState.timeRemaining = gameState.timeRemaining;
            
            // Sincronizar jugadores
            this.gameEngine.gameState.players.clear();
            if (gameState.players) {
                gameState.players.forEach(player => {
                    this.gameEngine.gameState.players.set(player.id, player);
                });
            }

            // Sincronizar apuestas activas
            this.gameEngine.gameState.bets.clear();
            if (gameState.activeBets) {
                gameState.activeBets.forEach(bet => {
                    this.gameEngine.gameState.bets.set(bet.playerId, bet);
                });
            }

            // Sincronizar cash outs
            this.gameEngine.gameState.cashOuts.clear();
            if (gameState.cashOuts) {
                gameState.cashOuts.forEach(cashOut => {
                    this.gameEngine.gameState.cashOuts.set(cashOut.playerId, cashOut);
                });
            }

            // Emitir estado sincronizado a todos los clientes conectados a esta réplica
            this.emitToSockets(SOCKET_EVENTS.GAME_STATE_UPDATE, gameState);
            
        } catch (error) {
            console.error('Error sincronizando estado del juego:', error);
        }
    }

    setSocketService(socketService) {
        this.socketService = socketService;
        
        // Si es líder, configurar suscripción a comandos de réplicas
        if (process.env.IS_LEADER === "true" && socketService.subClient) {
            this.setupLeaderCommandListener(socketService);
        }
    }

    async setupLeaderCommandListener(socketService) {
        try {
            await socketService.subClient.subscribe('leader_commands', (message) => {
                try {
                    const command = JSON.parse(message);
                    console.log(`Comando recibido de ${command.source}:`, command.action);
                    
                    // Procesar comandos de las réplicas
                    switch (command.action) {
                        case 'player_join':
                            this.playerJoin(command.data.socketId, command.data.playerData);
                            break;
                        case 'place_bet':
                            const betResult = this.placeBet(command.data.socketId, command.data.betData);
                            // Enviar respuesta de vuelta via Redis si es necesario
                            break;
                        case 'cash_out':
                            const cashResult = this.cashOut(command.data.socketId);
                            break;
                        case 'player_leave':
                            this.playerLeave(command.data.socketId);
                            break;
                    }
                } catch (error) {
                    console.error('Error procesando comando de réplica:', error);
                }
            });
        } catch (error) {
            console.error('Error configurando listener de comandos:', error);
        }
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
