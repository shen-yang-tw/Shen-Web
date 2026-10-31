#!/bin/bash

# 1. 在背景啟動 Ollama 伺服器
ollama serve &
PID=$!

# 2. 等待 Ollama 服務完全啟動
echo "⏳ 等待 Ollama 服務就緒..."
until ollama list > /dev/null 2>&1; do
    sleep 1
done

# 3. 檢查模型是否已存在，若已有則直接跳過下載
MODEL_NAME="qwen2.5:3b"

echo "🔍 檢查本地模型狀態..."
if ollama list | grep -q "$MODEL_NAME"; then
    echo "✅ 偵測到本地已存在模型 [$MODEL_NAME]，跳過下載。"
else
    echo "📥 正在自動下載 Ollama 模型 ($MODEL_NAME)..."
    ollama pull "$MODEL_NAME"
    echo "✅ 模型下載完成！"
fi

echo "✅ Ollama 服務與模型已全部就緒！"

# 4. 讓容器保持前景運行
wait $PID