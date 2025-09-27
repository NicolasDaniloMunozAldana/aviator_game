import { GAME_STATES} from "../utils/constants.js";

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
    }

    addPlayer(playerId, playerData) {
        this.players.set(playerId, {
            id: playerId,
            username: playerData.username,
            balance: playerData.balance || 1000,
            joinedAt: new Date(),
            ...playerData
        });
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.bets.delete(playerId);
        this.cashOuts.delete(playerId);
    }

    placeBet(playerId, betData) {
        if (this.currentState !== GAME_STATES.WAITING && 
            this.currentState !== GAME_STATES.COUNTDOWN) {
            throw new Error('No se pueden aceptar apuestas en este momento');
        }

        const player = this.players.get(playerId);
        if (!player) {
            throw new Error('Jugador no encontrado');
        }

        if (player.balance < betData.amount) {
            throw new Error('Saldo insuficiente');
        }

        if (this.bets.has(playerId)) {
            throw new Error('Ya tienes una apuesta activa en esta ronda');
        }

        player.balance -= betData.amount;

        this.bets.set(playerId, {
            playerId,
            playerName: player.username,
            amount: betData.amount,
            placedAt: new Date(),
            multiplier: null,
            won: false,
            cashedOut: false
        });

        return player.balance;
    }

    cashOut(playerId) {
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
        const multiplier = this.currentMultiplier;
        const winnings = bet.amount * multiplier;

        this.cashOuts.set(playerId, {
            playerId,
            cashOutMultiplier: multiplier,
            winnings: winnings,
            cashedOutAt: new Date()
        });

        bet.multiplier = multiplier;
        bet.won = true;

        const player = this.players.get(playerId);
        player.balance += winnings;

        return { winnings, newBalance: player.balance, multiplier };
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

    calculateRoundResults() {
        const results = [];

        for (const [playerId, bet] of this.bets.entries()) {
            const player = this.players.get(playerId);
            const cashOut = this.cashOuts.get(playerId);

            if (cashOut) {
                results.push({
                    playerId,
                    username: player.username,
                    betAmount: bet.amount,
                    cashOutMultiplier: cashOut.cashOutMultiplier,
                    winnings: cashOut.winnings,
                    won: true
                });
            } else {
                results.push({
                    playerId,
                    username: player.username,
                    betAmount: bet.amount,
                    cashOutMultiplier: this.currentMultiplier,
                    winnings: 0,
                    won: false
                });
            }
        }

        return results;
    }

    resetForNewRound() {
        this.bets.clear();
        this.cashOuts.clear();
        this.currentMultiplier = 1.00;
        this.currentState = GAME_STATES.WAITING;
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