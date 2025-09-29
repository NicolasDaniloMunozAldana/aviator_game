#!/bin/bash

echo "=== Prueba de Failover ==="

# Identificar el maestro actual
MASTER=$(docker exec postgres1 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list | grep Leader | awk '{print $2}')
echo "Maestro actual: $MASTER"

if [ -z "$MASTER" ]; then
    echo "Error: No se pudo identificar el maestro"
    exit 1
fi

# Crear datos de prueba antes del failover
export PGPASSWORD=postgres123
echo "Insertando datos de prueba..."
psql -h localhost -p 5432 -U postgres -d postgres -c "
CREATE TABLE IF NOT EXISTS failover_test (id SERIAL, test_time TIMESTAMP DEFAULT NOW(), event TEXT);
INSERT INTO failover_test (event) VALUES ('Antes del failover - $(date)');
"

echo "Datos antes del failover:"
psql -h localhost -p 5432 -U postgres -d postgres -c "SELECT * FROM failover_test ORDER BY id DESC LIMIT 3;"

# Simular fallo del maestro
echo -e "\nSimulando fallo del maestro ($MASTER)..."
docker stop $MASTER

echo "Esperando failover (30 segundos)..."
sleep 30

# Verificar nuevo maestro
echo -e "\nEstado después del failover:"
docker exec postgres1 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list 2>/dev/null || \
docker exec postgres2 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list 2>/dev/null || \
docker exec postgres3 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list

# Probar escritura después del failover
echo -e "\nProbando escritura después del failover..."
psql -h localhost -p 5432 -U postgres -d postgres -c "
INSERT INTO failover_test (event) VALUES ('Después del failover - $(date)');
SELECT * FROM failover_test ORDER BY id DESC LIMIT 5;
"

# Restaurar el nodo caído
echo -e "\nRestaurando nodo $MASTER..."
docker start $MASTER

echo "Esperando que se reincorpore (20 segundos)..."
sleep 20

echo -e "\nEstado final del cluster:"
docker exec postgres1 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list 2>/dev/null || \
docker exec postgres2 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list 2>/dev/null || \
docker exec postgres3 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list

echo "Prueba de failover completada"