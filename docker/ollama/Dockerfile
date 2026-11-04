FROM ollama/ollama:latest

# Normalize line endings defensively so a CRLF checkout (Windows) can never break the shebang.
COPY docker/ollama/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
