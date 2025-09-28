import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './BettingPanel.css';

const BettingPanel = () => {
  const { player, gameState, placeBet, cashOut, connected } = useGame();
  const [betAmount, setBetAmount] = useState(10);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // Find my bet in active bets
  const myBet = gameState.activeBets?.find(bet => bet.playerId === player.id);
  const hasActiveBet = !!myBet || player.hasBet;
  const hasCashedOut = myBet?.hasCashedOut || player.hasCashedOut;

  const canBet = connected && 
                (gameState.currentState === 'waiting' || gameState.currentState === 'countdown') &&
                !hasActiveBet &&
                !isPlacingBet;
  
  const canCashOut = connected && 
                    gameState.currentState === 'in_progress' && 
                    hasActiveBet && 
                    !hasCashedOut;

  const handleBet = async () => {
    if (!connected) {
      alert('Sin conexión al servidor');
      return;
    }
    if (betAmount > player.balance) {
      alert('Saldo insuficiente');
      return;
    }
    if (betAmount < 1) {
      alert('La apuesta mínima es $1');
      return;
    }
    
    setIsPlacingBet(true);
    try {
      await placeBet(betAmount);
    } finally {
      setTimeout(() => setIsPlacingBet(false), 1000);
    }
  };

  const handleCashOut = () => {
    if (canCashOut) {
      cashOut();
    }
  };

  const quickBets = [5, 10, 25, 50, 100];

  const getPotentialWinnings = () => {
    if (hasActiveBet && gameState.currentMultiplier) {
      return (myBet.amount * gameState.currentMultiplier).toFixed(2);
    }
    return (betAmount * gameState.currentMultiplier).toFixed(2);
  };

  const getBetButtonText = () => {
    if (isPlacingBet) return 'Apostando...';
    if (hasActiveBet) return `Apostaste $${myBet.amount}`;
    if (gameState.currentState === 'countdown') return '¡Apuesta ahora!';
    return 'Apostar';
  };

  const getCashOutButtonText = () => {
    if (hasCashedOut) {
      return `Retirado en ${myBet.cashOutMultiplier?.toFixed(2)}x`;
    }
    return `RETIRAR $${getPotentialWinnings()}`;
  };

  return (
    <div className="betting-panel">
      <div className="player-info">
        <div className="player-details">
          <h3>{player.username}</h3>
          <div className="balance">
            <span>Saldo: </span>
            <strong>${player.balance.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div className="bet-controls">
        <div className="bet-amount">
          <label>Cantidad de apuesta:</label>
          <div className="input-group">
            <input
              type="number"
              min="1"
              max="1000"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
              disabled={hasActiveBet || gameState.currentState === 'in_progress'}
            />
            <span className="currency">USD</span>
          </div>
        </div>

        <div className="quick-bets">
          <span className="quick-label">Apuestas rápidas:</span>
          {quickBets.map(amount => (
            <button
              key={amount}
              className={`quick-bet-btn ${betAmount === amount ? 'selected' : ''}`}
              onClick={() => setBetAmount(amount)}
              disabled={hasActiveBet || gameState.currentState === 'in_progress'}
            >
              ${amount}
            </button>
          ))}
        </div>

        {!hasActiveBet ? (
          <button
            className={`bet-btn ${canBet ? 'active' : 'disabled'}`}
            onClick={handleBet}
            disabled={!canBet}
          >
            {getBetButtonText()}
          </button>
        ) : (
          <div className="bet-status">
            <div className="active-bet">
              ✅ Apuesta activa: ${myBet.amount}
            </div>
            {gameState.currentState === 'in_progress' && (
              <div className="potential-winnings">
                Ganancia potencial: ${getPotentialWinnings()}
              </div>
            )}
          </div>
        )}

        {hasActiveBet && (
          <button
            className={`cashout-btn ${canCashOut ? 'active' : hasCashedOut ? 'cashed-out' : 'disabled'}`}
            onClick={handleCashOut}
            disabled={!canCashOut}
          >
            {getCashOutButtonText()}
          </button>
        )}
      </div>

      {gameState.currentState === 'waiting' && (
        <div className="betting-tips">
          💡 Coloca tu apuesta antes de que despegue el avión
        </div>
      )}

      {gameState.currentState === 'countdown' && (
        <div className="betting-tips countdown">
          ⏰ ¡Últimos segundos para apostar!
        </div>
      )}



      {hasCashedOut && (
        <div className="cashout-success">
          🎉 ¡Retirado exitosamente en {myBet.cashOutMultiplier?.toFixed(2)}x!
          <br />
          Ganaste: ${(myBet.amount * myBet.cashOutMultiplier).toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default BettingPanel;