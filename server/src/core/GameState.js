import { GAME_STATES} from "../utils/constants.js";
import databaseService from '../services/DatabaseService.js';
import authService from '../services/AuthService.js';
import { Bet } from '../models/Bet.js';
import { GameRound } from '../models/GameRound.js';

export class GameState {
    constructor() {
        this.currentState = GAME_STATES.WAITING;
        this.currentMultiplier = 1.00;
        this.players = new Map(); // Map<playerId, playerData>
        this.bets = new Map(); // Map<playerId, betData>
        this.cashOuts = new Map(); // Map<playerId, cashOutData>
        this.roundNumber = 0;
        this.startTime = null;
        this.timeRemaining = 0;
        this.gameHistory = [];
        this.currentRoundId = null;
        this.currentRoundStartTime = null;
    }

    addPlayer(playerId, playerData) {
        // Usar datos del jugador autenticado desde AuthService
        const authenticatedPlayer = authService.getPlayerBySocket(playerId);
        if (authenticatedPlayer) {
            this.players.set(playerId, {
                id: authenticatedPlayer.id,
                username: authenticatedPlayer.username,
                balance: authenticatedPlayer.balance,
                joinedAt: new Date(),
                userToken: authenticatedPlayer.userToken,
                ...playerData
            });
        } else {
            // Fallback para compatibilidad
            this.players.set(playerId, {
                id: playerId,
                username: playerData.username,
                balance: playerData.balance || 1000,
                joinedAt: new Date(),
                ...playerData
            });
        }
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.bets.delete(playerId);
        this.cashOuts.delete(playerId);
    }

    async placeBet(playerId, betData) {
        if (this.currentState !== GAME_STATES.WAITING && 
            this.currentState !== GAME_STATES.COUNTDOWN) {
            throw new Error('No se pueden aceptar apuestas en este momento');
        }

        const player = this.players.get(playerId);
        const authenticatedPlayer = authService.getPlayerBySocket(playerId);
        
        if (!player || !authenticatedPlayer) {
            throw new Error('Jugador no encontrado');
        }

        // Validar apuesta
        const validation = authService.validateBetAmount(authenticatedPlayer, betData.amount);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        if (this.bets.has(playerId)) {
            throw new Error('Ya tienes una apuesta activa en esta ronda');
        }

        try {
            // Actualizar balance en base de datos y sesión
            const newBalance = authenticatedPlayer.balance - betData.amount;
            await authService.updatePlayerBalance(authenticatedPlayer.id, newBalance);

            // Actualizar balance local del jugador
            player.balance = newBalance;

            // Crear apuesta en memoria
            this.bets.set(playerId, {
                playerId: authenticatedPlayer.id,
                playerName: authenticatedPlayer.username,
                amount: betData.amount,
                placedAt: new Date(),
                multiplier: null,
                won: false,
                cashedOut: false
            });

            // Si hay ronda activa, guardar apuesta en BD
            if (this.currentRoundId) {
                await databaseService.createBet(
                    authenticatedPlayer.id, 
                    this.currentRoundId, 
                    this.roundNumber, 
                    betData.amount
                );
            }

            return newBalance;
        } catch (error) {
            console.error('Error procesando apuesta:', error);
            throw new Error('Error procesando apuesta: ' + error.message);
        }
    }

    async cashOut(playerId) {
        if (this.currentState !== GAME_STATES.IN_PROGRESS) {
            throw new Error('No se puede retirar en este momento');
        }

        if (!this.bets.has(playerId)) {
            throw new Error('No tienes apuestas activas');
        }

        if (this.cashOuts.has(playerId)) {
            throw new Error('Ya has retirado en esta ronda');
        }

        const bet = this.bets.get(playerId);
        const player = this.players.get(playerId);
        const authenticatedPlayer = authService.getPlayerBySocket(playerId);
        
        if (!authenticatedPlayer) {
            throw new Error('Jugador no autenticado');
        }

        const multiplier = this.currentMultiplier;
        const winnings = bet.amount * multiplier;

        try {
            // Actualizar balance en base de datos y sesión
            const newBalance = authenticatedPlayer.balance + winnings;
            await authService.updatePlayerBalance(authenticatedPlayer.id, newBalance);

            // Actualizar en memoria
            this.cashOuts.set(playerId, {
                playerId: authenticatedPlayer.id,
                cashOutMultiplier: multiplier,
                winnings: winnings,
                cashedOutAt: new Date()
            });

            bet.multiplier = multiplier;
            bet.won = true;
            bet.cashedOut = true;

            // Actualizar balance local del jugador
            player.balance = newBalance;

            // Actualizar apuesta en base de datos
            await databaseService.updateBetCashOut(
                authenticatedPlayer.id,
                this.roundNumber,
                multiplier,
                winnings
            );

            return { winnings, newBalance, multiplier };
        } catch (error) {
            console.error('Error procesando cash out:', error);
            throw new Error('Error procesando retiro: ' + error.message);
        }
    }

    getActiveBets() {
        return Array.from(this.bets.entries()).map(([playerId, bet]) => {
            const player = this.players.get(playerId);
            const cashOut = this.cashOuts.get(playerId);
            return {
                ...bet,
                player: player,
                hasCashedOut: !!cashOut,
                cashOutMultiplier: cashOut?.cashOutMultiplier || null
            };
        });
    }


    getPlayerBets(playerId) {
        const playerBets = [];
        for (const [betPlayerId, bet] of this.bets.entries()) {
            if (betPlayerId === playerId) {
                playerBets.push({
                    ...bet,
                    player: this.players.get(playerId)
                });
            }
        }
        return playerBets;
    }

    async calculateRoundResults() {
        const results = [];
        let totalBets = 0;
        let totalAmount = 0;

        for (const [playerId, bet] of this.bets.entries()) {
            const player = this.players.get(playerId);
            const authenticatedPlayer = authService.getPlayerBySocket(playerId);
            const cashOut = this.cashOuts.get(playerId);

            totalBets++;
            totalAmount += bet.amount;

            if (cashOut) {
                results.push({
                    playerId: authenticatedPlayer?.id || playerId,
                    username: player.username,
                    betAmount: bet.amount,
                    cashOutMultiplier: cashOut.cashOutMultiplier,
                    winnings: cashOut.winnings,
                    won: true
                });

                // Actualizar estadísticas del jugador
                if (authenticatedPlayer) {
                    await databaseService.updatePlayerStats(
                        authenticatedPlayer.id,
                        cashOut.winnings,
                        0,
                        1
                    );
                }
            } else {
                results.push({
                    playerId: authenticatedPlayer?.id || playerId,
                    username: player.username,
                    betAmount: bet.amount,
                    cashOutMultiplier: this.currentMultiplier,
                    winnings: 0,
                    won: false
                });

                // Actualizar estadísticas del jugador (pérdida)
                if (authenticatedPlayer) {
                    await databaseService.updatePlayerStats(
                        authenticatedPlayer.id,
                        0,
                        bet.amount,
                        1
                    );
                }
            }
        }

        // Guardar información de la ronda en base de datos
        if (this.currentRoundStartTime && process.env.IS_LEADER === "true") {
            try {
                await databaseService.createGameRound(
                    this.roundNumber,
                    this.currentMultiplier,
                    this.currentRoundStartTime,
                    new Date(),
                    totalBets,
                    totalAmount
                );
            } catch (error) {
                console.error('Error guardando ronda en BD:', error);
            }
        }

        return results;
    }

    resetForNewRound() {
        this.bets.clear();
        this.cashOuts.clear();
        this.currentMultiplier = 1.00;
        this.currentState = GAME_STATES.WAITING;
        this.currentRoundId = null;
        this.currentRoundStartTime = null;
    }

    // Método para iniciar nueva ronda con tracking de BD
    startNewRound() {
        this.currentRoundStartTime = new Date();
        // El ID de ronda se asignará cuando se guarde en BD al final de la ronda
    }

    // Cargar historial desde base de datos
    async loadGameHistory() {
        try {
            const historyData = await databaseService.getGameHistory(50);
            this.gameHistory = historyData.map(round => new GameRound(round).toJSON());
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.gameHistory = [];
        }
    }

    toJSON() {
        return {
            currentState: this.currentState,
            currentMultiplier: this.currentMultiplier,
            players: Array.from(this.players.values()),
            activeBets: this.getActiveBets(),
            roundNumber: this.roundNumber,
            timeRemaining: this.timeRemaining,
            playerCount: this.players.size,
            cashOuts: Array.from(this.cashOuts.values())
        };
    }
}