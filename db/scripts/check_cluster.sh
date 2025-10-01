#!/bin/bash

# Script rápido para ver el estado básico
echo "=== Estado rápido del cluster ==="

# Mostrar lista de Patroni
docker exec postgres1 /opt/patroni-venv/bin/patronictl -c /opt/patroni/patroni.yml list 2>/dev/null || echo "Error: Patroni no disponible"

# Mostrar qué contenedores están up
echo -e "\nContenedores activos:"
docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Ports}}"