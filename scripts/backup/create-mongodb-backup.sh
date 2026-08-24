#!/usr/bin/env bash
set -euo pipefail

: "${MONGODB_BACKUP_URI:?MONGODB_BACKUP_URI is required}"
: "${MONGODB_BACKUP_DATABASE:?MONGODB_BACKUP_DATABASE is required}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"

MONGO_TOOLS_IMAGE="${MONGO_TOOLS_IMAGE:-mongo:8.0.29-noble}"
BACKUP_OUTPUT_DIR="${BACKUP_OUTPUT_DIR:-.backups}"

mkdir -p "$BACKUP_OUTPUT_DIR"
chmod 700 "$BACKUP_OUTPUT_DIR"

backup_timestamp="$(date -u +'%Y-%m-%dT%H-%M-%SZ')"
archive_name="nutriplan-${MONGODB_BACKUP_DATABASE}-${backup_timestamp}.archive.gz"
archive_path="${BACKUP_OUTPUT_DIR}/${archive_name}"
encrypted_path="${archive_path}.gpg"
checksum_path="${encrypted_path}.sha256"

cleanup() {
  rm -f "$archive_path"

  if [[ -n "${restore_container_id:-}" ]]; then
    docker rm -f "$restore_container_id" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "Creating MongoDB backup archive..."
docker run --rm \
  -e MONGODB_BACKUP_URI \
  -e MONGODB_BACKUP_DATABASE \
  -v "${PWD}/${BACKUP_OUTPUT_DIR}:/backup" \
  "$MONGO_TOOLS_IMAGE" \
  sh -lc 'mongodump \
    --uri="$MONGODB_BACKUP_URI" \
    --db="$MONGODB_BACKUP_DATABASE" \
    --archive="/backup/'"$archive_name"'" \
    --gzip'

if [[ ! -s "$archive_path" ]]; then
  echo "Backup archive was not created or is empty." >&2
  exit 1
fi

echo "Starting disposable MongoDB for restore verification..."
restore_container_id="$(docker run -d --rm mongo:8.0.29-noble --bind_ip_all)"

for attempt in {1..30}; do
  if docker exec "$restore_container_id" mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' 2>/dev/null | grep -q '^1$'; then
    break
  fi

  if [[ "$attempt" -eq 30 ]]; then
    echo "Disposable MongoDB did not become ready in time." >&2
    exit 1
  fi

  sleep 1
done

echo "Restoring backup into disposable MongoDB..."
docker run --rm \
  --network "container:${restore_container_id}" \
  -v "${PWD}/${BACKUP_OUTPUT_DIR}:/backup:ro" \
  "$MONGO_TOOLS_IMAGE" \
  sh -lc 'mongorestore \
    --host=127.0.0.1 \
    --port=27017 \
    --archive="/backup/'"$archive_name"'" \
    --gzip \
    --drop \
    --nsFrom="'"$MONGODB_BACKUP_DATABASE"'.*" \
    --nsTo="backup_verification.*"'

echo "Validating restored database..."
restored_collections="$(docker exec "$restore_container_id" mongosh backup_verification --quiet --eval 'db.getCollectionNames().length')"

if ! [[ "$restored_collections" =~ ^[0-9]+$ ]] || [[ "$restored_collections" -lt 1 ]]; then
  echo "Restore verification failed: no collections were restored." >&2
  exit 1
fi

echo "Encrypting verified backup..."
printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE" | gpg \
  --batch \
  --yes \
  --symmetric \
  --cipher-algo AES256 \
  --pinentry-mode loopback \
  --passphrase-fd 0 \
  --output "$encrypted_path" \
  "$archive_path"

if [[ ! -s "$encrypted_path" ]]; then
  echo "Encrypted backup was not created or is empty." >&2
  exit 1
fi

sha256sum "$encrypted_path" > "$checksum_path"
chmod 600 "$encrypted_path" "$checksum_path"

rm -f "$archive_path"

echo "Backup created and restore-verified successfully."
echo "Encrypted file: ${encrypted_path}"
echo "Restored collections: ${restored_collections}"
