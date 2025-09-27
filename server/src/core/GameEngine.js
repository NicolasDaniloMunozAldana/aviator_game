import {EventEmitter} from 'events';
import { GAME_CONFIG, GAME_STATES } from '../utils/constants.js';
import { CrashMultiplier } from './CrashMultiplier.js';
import { GameState } from './GameState.js';


export class GameEngine extends EventEmitter {
    constructor() {
        super();
        this.gameState = new GameState();
        this.crashMultiplier = new CrashMultiplier();
        this.roundInterval = null;
        this.multiplierInterval = null;
        this.countdownInterval = null;
        this.waitingInterval = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.gameState.roundNumber = 1;
        this.startWaitingPhase();
    }

    /**
     * Fase de espera para jugadores
     */
    startWaitingPhase() {
        this.gameState.currentState = GAME_STATES.WAITING;
        this.gameState.timeRemaining = GAME_CONFIG.WAITING_DURATION / 1000;

        this.emit('gameStateUpdate', this.gameState.toJSON());

        // Countdown durante la fase de waiting
        let waitingTime = GAME_CONFIG.WAITING_DURATION / 1000;
        this.waitingInterval = setInterval(() => {
            waitingTime--;
            this.gameState.timeRemaining = waitingTime;
            
            this.emit('gameStateUpdate', this.gameState.toJSON());
            this.emit('waitingCountdown', { timeRemaining: waitingTime });

            if (waitingTime <= 0) {
                clearInterval(this.waitingInterval);
                this.startCountdownPhase();
            }
        }, 1000);
    }

    /**
     * Fase de cuenta regresiva
     */
    startCountdownPhase() {
        this.gameState.currentState = GAME_STATES.COUNTDOWN;
        this.gameState.timeRemaining = GAME_CONFIG.COUNTDOWN_DURATION / 1000;

        let countdown = GAME_CONFIG.COUNTDOWN_DURATION / 1000;

        this.countdownInterval = setInterval(() => {
            this.gameState.timeRemaining = countdown;
            this.emit('gameStateUpdate', this.gameState.toJSON());

            if (countdown <= 0) {
                clearInterval(this.countdownInterval);
                this.startMultiplierPhase();
            }
            countdown--;
        }, 1000);
    }

    /**
     * Fase donde el multiplicador aumenta
     */
    startMultiplierPhase() {
        this.gameState.currentState = GAME_STATES.IN_PROGRESS;
        this.crashMultiplier.reset();

        this.multiplierInterval = setInterval(() => {
            const updateResult = this.crashMultiplier.update();
            this.gameState.currentMultiplier = updateResult.multiplier;

            this.emit('multiplierUpdate', {
                multiplier: updateResult.multiplier,
                roundNumber: this.gameState.roundNumber
            });

            // Verificar si el juego ha crashado
            if (updateResult.crashed) {
                this.endRound();
            }
        }, GAME_CONFIG.MULTIPLIER_UPDATE_INTERVAL);
    }

    /**
     * Finaliza la ronda y calcula resultados
     */
    endRound() {
        clearInterval(this.multiplierInterval);
        this.gameState.currentState = GAME_STATES.CRASHED;

        // Calcular resultados finales
        const roundResults = this.gameState.calculateRoundResults();
        
        // Agregar al historial
        this.gameState.gameHistory.unshift({
            roundNumber: this.gameState.roundNumber,
            crashMultiplier: this.gameState.currentMultiplier,
            results: roundResults,
            endedAt: new Date()
        });

        // Mantener solo últimos 50 juegos en historial
        if (this.gameState.gameHistory.length > 50) {
            this.gameState.gameHistory = this.gameState.gameHistory.slice(0, 50);
        }

        this.emit('roundComplete', {
            roundNumber: this.gameState.roundNumber,
            crashMultiplier: this.gameState.currentMultiplier,
            results: roundResults
        });

        // Preparar siguiente ronda después del delay configurado
        setTimeout(() => {
            this.gameState.roundNumber++;
            this.gameState.resetForNewRound();
            this.startWaitingPhase();
        }, GAME_CONFIG.CRASH_DELAY);
    }

    /**
     * Jugador realiza una apuesta
     */
    placeBet(playerId, betData) {
        try {
            const player = this.gameState.players.get(playerId);
            if (!player) {
                return { success: false, error: 'Jugador no encontrado' };
            }

            const newBalance = this.gameState.placeBet(playerId, betData);
            
            // Emit bet placed with player info
            this.emit('betPlaced', {
                playerId,
                betData: {
                    ...betData,
                    playerName: player.username
                },
                newBalance,
                roundNumber: this.gameState.roundNumber,
                gameState: this.gameState.toJSON()
            });

            return { success: true, newBalance };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }


    /**
     * Jugador retira sus ganancias
     */
    cashOut(playerId) {
        try {
            const player = this.gameState.players.get(playerId);
            if (!player) {
                return { success: false, error: 'Jugador no encontrado' };
            }

            const result = this.gameState.cashOut(playerId);
            
            this.emit('cashOut', {
                playerId,
                playerName: player.username,
                ...result,
                roundNumber: this.gameState.roundNumber,
                gameState: this.gameState.toJSON()
            });

            return { success: true, ...result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Jugador se une al juego
     */
    playerJoin(playerId, playerData) {
        this.gameState.addPlayer(playerId, playerData);
        
        // Emit player joined with updated game state
        this.emit('playerJoined', {
            playerId,
            playerData: this.gameState.players.get(playerId),
            playerCount: this.gameState.players.size,
            gameState: this.gameState.toJSON()
        });
    }


    /**
     * Jugador abandona el juego
     */
    playerLeave(playerId) {
        const player = this.gameState.players.get(playerId);
        this.gameState.removePlayer(playerId);
        
        this.emit('playerLeft', {
            playerId,
            playerData: player,
            playerCount: this.gameState.players.size
        });
    }

    /**
     * Obtiene estado actual del juego
     */
    getGameState() {
        return this.gameState.toJSON();
    }

    /**
     * Obtiene historial de juegos
     */
    getGameHistory(limit = 10) {
        return this.gameState.gameHistory.slice(0, limit);
    }

    /**
     * Detiene el motor del juego
     */
    stop() {
        clearInterval(this.roundInterval);
        clearInterval(this.multiplierInterval);
        clearInterval(this.countdownInterval);
        clearInterval(this.waitingInterval);
        this.isRunning = false;
    }

}
