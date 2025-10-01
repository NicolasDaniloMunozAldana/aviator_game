export class Bet {
    constructor(data) {
        this.id = data.id;
        this.playerId = data.player_id;
        this.roundId = data.round_id;
        this.roundNumber = parseInt(data.round_number);
        this.betAmount = parseFloat(data.bet_amount);
        this.cashOutMultiplier = data.cash_out_multiplier ? parseFloat(data.cash_out_multiplier) : null;
        this.winnings = parseFloat(data.winnings) || 0.00;
        this.cashedOut = data.cashed_out || false;
        this.won = data.won || false;
        this.placedAt = data.placed_at;
        this.cashedOutAt = data.cashed_out_at;
        this.username = data.username;
        this.crashMultiplier = data.crash_multiplier ? parseFloat(data.crash_multiplier) : null;
    }

    toJSON() {
        return {
            id: this.id,
            playerId: this.playerId,
            roundId: this.roundId,
            roundNumber: this.roundNumber,
            betAmount: this.betAmount,
            cashOutMultiplier: this.cashOutMultiplier,
            winnings: this.winnings,
            cashedOut: this.cashedOut,
            won: this.won,
            placedAt: this.placedAt,
            cashedOutAt: this.cashedOutAt,
            username: this.username,
            crashMultiplier: this.crashMultiplier,
            profitLoss: this.getProfitLoss()
        };
    }

    getProfitLoss() {
        return this.winnings - this.betAmount;
    }

    // Para compatibilidad con el formato actual del juego
    toGameFormat() {
        return {
            playerId: this.playerId,
            playerName: this.username,
            amount: this.betAmount,
            placedAt: this.placedAt,
            multiplier: this.cashOutMultiplier,
            won: this.won,
            cashedOut: this.cashedOut,
            hasCashedOut: this.cashedOut,
            cashOutMultiplier: this.cashOutMultiplier
        };
    }
}
