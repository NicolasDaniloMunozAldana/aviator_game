import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

import socketService from './services/SocketService.js';
import gameService from './services/GameService.js';


dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());


app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Aviator Game Server Running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/game/state', (req, res) => {
    res.json(gameService.getGameState());
});

app.get('/api/game/history', (req, res) => {
    res.json(gameService.getGameHistory());
});

socketService.initialize(server);


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Servidor de Aviator ejecutándose en puerto ${PORT}`);
    console.log(`Host: ${HOST}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`WebSockets: Habilitados`);
});