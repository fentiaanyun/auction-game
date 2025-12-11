@echo off
chcp 65001 >nul
echo ========================================
echo   臻藏拍卖 - 模块测试服务器
echo ========================================
echo.
echo 正在启动本地服务器...
echo.
echo ✅ 服务器启动后，请在浏览器中访问：
echo.
echo    主应用：
echo      http://localhost:8000/index.html
echo.
echo    测试页面：
echo      http://localhost:8000/index-test.html        (协议检查)
echo      http://localhost:8000/test-modules.html      (模块测试)
echo      http://localhost:8000/test-performance.html  (性能测试)
echo.
echo ⚠️  重要：不要直接双击HTML文件打开！
echo    必须通过 http://localhost:8000 访问
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

python -m http.server 8000

pause

