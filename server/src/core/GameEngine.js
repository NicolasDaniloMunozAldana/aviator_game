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
        this.gameState.timeRemaining = GAME_CONFIG.ROUND_DURATION / 1000;

        this.emit('gameStateUpdate', this.gameState.toJSON());

        setTimeout(() => {
            this.startCountdownPhase();
        }, GAME_CONFIG.ROUND_DURATION);
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

        // Preparar siguiente ronda después de 3 segundos
        setTimeout(() => {
            this.gameState.roundNumber++;
            this.gameState.resetForNewRound();
            this.startWaitingPhase();
        }, 3000);
    }

    /**
     * Jugador realiza una apuesta
     */
    placeBet(playerId, betData) {
        try {
            const newBalance = this.gameState.placeBet(playerId, betData);
            
            this.emit('betPlaced', {
                playerId,
                betData,
                newBalance,
                roundNumber: this.gameState.roundNumber
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
            const result = this.gameState.cashOut(playerId);
            
            this.emit('cashOut', {
                playerId,
                ...result,
                roundNumber: this.gameState.roundNumber
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
        this.emit('playerJoined', {
            playerId,
            playerData: this.gameState.players.get(playerId),
            playerCount: this.gameState.players.size
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
        this.isRunning = false;
    }

}
