#!/bin/bash

echo "========================================"
echo "  臻藏拍卖 - 模块测试服务器"
echo "========================================"
echo ""
echo "正在启动本地服务器..."
echo ""
echo "访问地址："
echo "  http://localhost:8000/test-modules.html"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "========================================"
echo ""

# 检查Python版本
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo "错误：未找到Python，请先安装Python"
    exit 1
fi

