FROM ollama/ollama:latest

# 複製啟動腳本
COPY docker/ollama/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 設定容器啟動時執行此腳本
ENTRYPOINT ["/entrypoint.sh"]