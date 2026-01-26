# 速率限制功能测试指南

## 功能说明

- **每小时限制**: 最多10次手动扫描
- **每天限制**: 最多20次手动扫描
- **超过限制**: 返回429状态码，错误信息："超过次数，请隔天再试"

## 测试方法

### 方法1: 使用浏览器开发者工具

1. **打开应用并登录**
   - 访问应用URL
   - 输入管理员密码登录

2. **打开浏览器开发者工具**
   - 按 `F12` 或右键 -> 检查
   - 切换到 `Network`（网络）标签

3. **快速连续点击"新品扫描"按钮**
   - 观察网络请求
   - 前10次应该成功（200状态码）
   - 第11次应该返回429状态码

4. **检查响应内容**
   - 第11次请求的响应应该包含：
     ```json
     {
       "error": "超过次数，请隔天再试",
       "hourlyCount": 10,
       "dailyCount": 10,
       "hourlyLimit": 10,
       "dailyLimit": 20
     }
     ```

### 方法2: 使用curl命令测试

```bash
# 1. 首先获取token（替换YOUR_PASSWORD为实际密码）
TOKEN=$(curl -X POST https://your-app.vercel.app/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}' \
  | jq -r '.token')

# 2. 连续发送11次扫描请求
for i in {1..11}; do
  echo "第 $i 次请求:"
  curl -X POST https://your-app.vercel.app/api/scout/run \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -w "\n状态码: %{http_code}\n\n"
  sleep 1
done
```

### 方法3: 使用Postman或类似工具

1. **创建认证请求**
   - URL: `POST /api/auth/verify`
   - Body: `{"password": "your_password"}`
   - 保存返回的 `token`

2. **创建扫描请求**
   - URL: `POST /api/scout/run`
   - Headers: `Authorization: Bearer {token}`
   - 使用Postman的"Runner"功能连续发送11次请求

3. **观察结果**
   - 前10次返回200状态码
   - 第11次返回429状态码

### 方法4: 使用Node.js脚本测试

创建一个测试脚本 `test-api.js`:

```javascript
const fetch = require('node-fetch');

async function testRateLimit() {
  // 1. 获取token
  const authResponse = await fetch('http://localhost:3000/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
  });
  
  const authData = await authResponse.json();
  const token = authData.token;
  
  console.log('Token获取成功，开始测试速率限制...\n');
  
  // 2. 连续发送请求
  for (let i = 1; i <= 12; i++) {
    const response = await fetch('http://localhost:3000/api/scout/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`第 ${i} 次请求:`);
    console.log(`  状态码: ${response.status}`);
    console.log(`  响应:`, data);
    
    if (response.status === 429) {
      console.log(`\n✅ 测试通过：第 ${i} 次请求被正确限制\n`);
      break;
    }
    
    // 等待1秒再发送下一次请求
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testRateLimit().catch(console.error);
```

运行：
```bash
ADMIN_PASSWORD=your_password node test-api.js
```

## 预期结果

### 成功场景（前10次）
- **状态码**: 200
- **响应**: 包含扫描结果或配置错误（如果环境变量未设置）

### 限制场景（第11次）
- **状态码**: 429 (Too Many Requests)
- **响应**:
  ```json
  {
    "error": "超过次数，请隔天再试",
    "hourlyCount": 10,
    "dailyCount": 10,
    "hourlyLimit": 10,
    "dailyLimit": 20
  }
  ```

## 测试要点

1. ✅ **每小时限制**: 连续发送11次请求，第11次应该被限制
2. ✅ **每天限制**: 发送21次请求（跨小时），第21次应该被限制
3. ✅ **错误信息**: 超过限制时返回正确的错误信息
4. ✅ **计数准确性**: 返回的计数应该准确反映当前使用情况
5. ✅ **Redis持久化**: 如果使用Redis，重启服务后计数应该保持

## 注意事项

- 速率限制基于**尝试执行**的次数，而不是**成功执行**的次数
- 即使扫描失败（如API错误），计数仍然会增加
- 每小时限制会在1小时后自动重置
- 每天限制会在24小时后自动重置
- 如果没有配置Redis，会使用内存存储（Serverless环境中可能不够可靠）

## 故障排查

### 问题1: 限制不生效
- 检查Redis连接是否正常
- 检查环境变量是否正确配置
- 查看服务器日志中的错误信息

### 问题2: 计数不准确
- 检查Redis key是否正确设置过期时间
- 检查是否有多个实例同时运行（可能导致计数不一致）

### 问题3: 内存存储模式下限制不生效
- 在Serverless环境中，每次函数调用可能使用新的实例
- 建议配置Redis以确保限制功能正常工作
