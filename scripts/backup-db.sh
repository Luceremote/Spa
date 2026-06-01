#!/usr/bin/env bash
# Backup de la base de datos a R2 (o disco local).
# Uso: ./scripts/backup-db.sh
# Variables esperadas:
#   DATABASE_URL          - URL de Postgres (Neon, Render, etc.)
#   BACKUP_DIR            - opcional, ruta local; default ./backups
#   BACKUP_S3_ENDPOINT    - opcional, p.ej. https://<acct>.r2.cloudflarestorage.com
#   BACKUP_S3_BUCKET      - opcional, nombre del bucket
#   BACKUP_S3_ACCESS_KEY  - opcional
#   BACKUP_S3_SECRET_KEY  - opcional
#   BACKUP_RETENTION_DAYS - opcional; default 30
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] ERROR: DATABASE_URL no configurada" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
TS="$(date -u +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/spa_${TS}.sql.gz"

mkdir -p "${BACKUP_DIR}"
echo "[backup] dump → ${FILE}"

pg_dump --no-owner --no-privileges --format=plain "${DATABASE_URL}" | gzip -9 > "${FILE}"

SIZE=$(du -h "${FILE}" | cut -f1)
echo "[backup] dump completo (${SIZE})"

# Subir a S3/R2 si está configurado
if [ -n "${BACKUP_S3_ENDPOINT:-}" ] && [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "[backup] WARN: aws cli no instalado; subida omitida" >&2
  else
    echo "[backup] subiendo a s3://${BACKUP_S3_BUCKET}/$(basename "${FILE}")"
    AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY}" \
    AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY}" \
      aws s3 cp "${FILE}" "s3://${BACKUP_S3_BUCKET}/db-backups/$(basename "${FILE}")" \
        --endpoint-url "${BACKUP_S3_ENDPOINT}"
    echo "[backup] subida ok"
  fi
fi

# Limpieza local: borrar > RETENTION días
find "${BACKUP_DIR}" -name 'spa_*.sql.gz' -mtime "+${RETENTION}" -delete 2>/dev/null || true
echo "[backup] ok (retención ${RETENTION}d)"
