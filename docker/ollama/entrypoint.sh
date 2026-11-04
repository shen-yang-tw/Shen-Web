#!/bin/sh
# Ollama container entrypoint (POSIX sh, LF line endings enforced by .gitattributes).
set -u

MODEL_NAME="${OLLAMA_CHAT_MODEL:-qwen2.5:3b}"

ollama serve &
SERVER_PID=$!

# Forward stop signals so `docker compose down` exits quickly.
trap 'kill -TERM "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID"; exit 0' TERM INT

echo "Waiting for Ollama server..."
until ollama list >/dev/null 2>&1; do
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Ollama server exited unexpectedly." >&2
        exit 1
    fi
    sleep 1
done

# Pull the model in the background so the healthcheck (server ready) is not blocked by a large download.
(
    if ollama list | grep -q "$MODEL_NAME"; then
        echo "Model [$MODEL_NAME] already present, skipping download."
    else
        echo "Pulling model [$MODEL_NAME]..."
        ollama pull "$MODEL_NAME" && echo "Model [$MODEL_NAME] ready." || echo "Model pull failed; will retry on next start." >&2
    fi
) &

wait "$SERVER_PID"
