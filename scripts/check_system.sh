#!/bin/bash

echo "🔍 Verificando conexión a PostgreSQL..."
psql -h localhost -p 15432 -U postgres -d aviator_game -c "SELECT NOW();" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL está corriendo correctamente"
    
    echo ""
    echo "📊 Verificando tablas creadas..."
    psql -h localhost -p 15432 -U postgres -d aviator_game -c "\dt" 2>/dev/null
    
    echo ""
    echo "👥 Usuarios en la base de datos:"
    psql -h localhost -p 15432 -U postgres -d aviator_game -c "SELECT username, balance, created_at FROM players;" 2>/dev/null
    
    echo ""
    echo "🎮 Últimas 5 rondas:"
    psql -h localhost -p 15432 -U postgres -d aviator_game -c "SELECT round_number, crash_multiplier, created_at FROM game_rounds ORDER BY round_number DESC LIMIT 5;" 2>/dev/null
else
    echo "❌ No se pudo conectar a PostgreSQL"
    echo "   Asegúrate de que la base de datos esté corriendo:"
    echo "   cd db && docker-compose up -d"
fi

echo ""
echo "🌐 Verificando backend..."
curl -s http://localhost:8080/api/health 2>/dev/null | json_pp 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Backend está corriendo"
else
    echo "❌ Backend no responde en http://localhost:8080"
    echo "   Asegúrate de que esté corriendo:"
    echo "   cd server && docker-compose up -d"
fi
