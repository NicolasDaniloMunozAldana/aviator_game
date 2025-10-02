#!/bin/bash

echo "🚀 Iniciando Aviator Game..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio base del proyecto
PROJECT_DIR="/Users/nicowtf/Documents/Universidad/Septimo Semestre/Sistemas Distribuidos/aviator_game"

# Función para verificar si un servicio está corriendo
check_service() {
    local service=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✅ $service está corriendo en puerto $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service NO está corriendo en puerto $port${NC}"
        return 1
    fi
}

echo "1️⃣  Levantando Base de Datos PostgreSQL..."
cd "$PROJECT_DIR/db"
docker-compose up -d
sleep 5

echo ""
echo "2️⃣  Verificando conexión a PostgreSQL..."
if psql -h localhost -p 15432 -U postgres -d aviator_game -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL conectado correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  Esperando a que PostgreSQL inicie...${NC}"
    sleep 10
    if psql -h localhost -p 15432 -U postgres -d aviator_game -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL conectado correctamente${NC}"
    else
        echo -e "${RED}❌ No se pudo conectar a PostgreSQL${NC}"
        echo "   Verifica los logs: cd db && docker-compose logs -f"
        exit 1
    fi
fi

echo ""
echo "3️⃣  Levantando Backend (Redis + Servidores + Nginx)..."
cd "$PROJECT_DIR/server"
docker-compose up -d
sleep 5

echo ""
echo "4️⃣  Verificando servicios del backend..."
check_service "Nginx (Load Balancer)" 8080

echo ""
echo "5️⃣  Verificando salud del backend..."
sleep 3
if curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend respondiendo correctamente${NC}"
    echo ""
    echo "Información del backend:"
    curl -s http://localhost:8080/api/health | json_pp 2>/dev/null || curl -s http://localhost:8080/api/health
else
    echo -e "${RED}❌ Backend no responde${NC}"
    echo "   Verifica los logs: cd server && docker-compose logs -f backend1"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Servicios de backend iniciados correctamente${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Servicios disponibles:"
echo "   🗄️  PostgreSQL: localhost:15432"
echo "   🔴 Redis: localhost:6379"
echo "   🌐 Backend API: http://localhost:8080"
echo ""
echo "6️⃣  Para iniciar el frontend, ejecuta:"
echo -e "   ${YELLOW}cd client && npm install && npm run dev${NC}"
echo ""
echo "📝 Comandos útiles:"
echo "   Ver logs del backend: cd server && docker-compose logs -f backend1"
echo "   Ver logs de la BD: cd db && docker-compose logs -f patroni1"
echo "   Verificar sistema: ./scripts/check_system.sh"
echo ""
