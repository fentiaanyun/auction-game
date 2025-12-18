@echo off
chcp 65001 >nul
echo ========================================
echo   臻藏拍卖 - 本地开发服务器（Vite）
echo ========================================
echo.
echo 正在启动本地开发服务器...
echo.
echo ✅ 服务器启动后，请在浏览器中访问：
echo.
echo    主应用：
echo      http://localhost:8000/
echo.
echo ⚠️  重要：不要直接双击HTML文件打开！
echo    必须通过 http://localhost:8000 访问
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

npm run dev

pause

