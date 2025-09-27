import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './BettingPanel.css';

const BettingPanel = () => {
  const { player, gameState, placeBet, cashOut, connected } = useGame();
  const [betAmount, setBetAmount] = useState(10);

  const canBet = connected && 
                (gameState.currentState === 'waiting' || gameState.currentState === 'countdown') &&
                !player.hasBet;
  
  const canCashOut = connected && 
                    gameState.currentState === 'in_progress' && 
                    player.hasBet && 
                    !player.hasCashedOut;

  const handleBet = () => {
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
    placeBet(betAmount);
  };

  const quickBets = [5, 10, 25, 50, 100];

  return (
    <div className="betting-panel">
      <div className="player-info">
        <h3>Jugador: {player.username}</h3>
        <p>Saldo: <strong>${player.balance.toFixed(2)}</strong></p>
      </div>

      <div className="bet-controls">
        <div className="bet-amount">
          <label>Cantidad de apuesta:</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="quick-bets">
          {quickBets.map(amount => (
            <button
              key={amount}
              className="quick-bet-btn"
              onClick={() => setBetAmount(amount)}
            >
              ${amount}
            </button>
          ))}
        </div>

        <button
          className={`bet-btn ${canBet ? 'active' : 'disabled'}`}
          onClick={handleBet}
          disabled={!canBet || player.hasBet}
        >
          {player.hasBet ? 'Apuesta colocada' : 'Apostar'}
        </button>

        <button
          className={`cashout-btn ${canCashOut ? 'active' : 'disabled'}`}
          onClick={cashOut}
          disabled={!canCashOut}
        >
          RETIRAR {gameState.currentMultiplier.toFixed(2)}x
        </button>
      </div>

      {player.hasCashedOut && (
        <div className="cashout-success">
          ¡Retirado exitosamente!
        </div>
      )}
    </div>
  );
};

export default BettingPanel;