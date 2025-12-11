# 🚀 快速启动测试服务器

## ⚠️ 重要提示

**ES6模块不支持直接打开HTML文件！**

您看到CORS错误是因为使用了 `file://` 协议。必须使用HTTP服务器。

## ✅ 正确方式

### 方法1：使用启动脚本（最简单）

**Windows用户：**
1. 双击 `start-test-server.bat` 文件
2. 等待服务器启动
3. 在浏览器访问：`http://localhost:8000/index-test.html`

**Linux/Mac用户：**
1. 在终端执行：`chmod +x start-test-server.sh`
2. 执行：`./start-test-server.sh`
3. 在浏览器访问：`http://localhost:8000/index-test.html`

### 方法2：手动启动

打开命令行/终端，执行：

```bash
# Windows
python -m http.server 8000

# Linux/Mac
python3 -m http.server 8000
```

然后在浏览器访问：
- `http://localhost:8000/index-test.html` （检查页面）
- `http://localhost:8000/test-modules.html` （测试页面）

### 方法3：使用VS Code Live Server

1. 安装 "Live Server" 扩展
2. 右键点击 `test-modules.html`
3. 选择 "Open with Live Server"

## 🔍 如何判断是否正确？

### ❌ 错误方式（会出现CORS错误）：
```
file:///C:/Users/yooyu/cusor/auction-game/test-modules.html
```
- 地址栏显示 `file://`
- 浏览器控制台显示CORS错误

### ✅ 正确方式：
```
http://localhost:8000/test-modules.html
```
- 地址栏显示 `http://`
- 页面正常加载，无CORS错误

## 📋 测试步骤

1. **启动服务器**
   - 双击 `start-test-server.bat`（Windows）
   - 或执行 `python -m http.server 8000`

2. **访问检查页面**
   - 打开浏览器
   - 访问：`http://localhost:8000/index-test.html`
   - 页面会显示当前协议状态

3. **访问测试页面**
   - 如果检查页面显示"✅ 正常"
   - 点击"打开测试页面"按钮
   - 或直接访问：`http://localhost:8000/test-modules.html`

4. **运行测试**
   - 打开浏览器开发者工具（F12）
   - 点击各个测试按钮
   - 查看测试结果

## 🐛 常见问题

### Q: 双击HTML文件为什么不行？
A: ES6模块的安全限制，不允许 `file://` 协议加载模块。必须使用HTTP服务器。

### Q: 端口8000被占用怎么办？
A: 使用其他端口，例如：
```bash
python -m http.server 8080
```
然后访问：`http://localhost:8080/test-modules.html`

### Q: 如何停止服务器？
A: 在命令行窗口按 `Ctrl+C`

### Q: 服务器启动后页面还是打不开？
A: 
1. 检查服务器是否真的在运行（命令行窗口应该显示"Serving HTTP on..."）
2. 确认访问的是 `http://localhost:8000/...` 而不是 `file:///...`
3. 检查防火墙是否阻止了8000端口

## 📞 需要帮助？

如果遇到问题：
1. 查看 `测试指南.md` 获取详细说明
2. 检查浏览器控制台的错误信息
3. 确认服务器是否正常运行

---

**记住：永远使用 `http://localhost:8000/` 访问，不要直接双击HTML文件！** 🎯

