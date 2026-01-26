<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Amazon Product Scout Agent - Vercel版本

这是一个运行在Vercel平台上的亚马逊产品侦察代理，每周自动扫描亚马逊网站，找出10个适合公司技术栈开发的产品，并生成报表自动发送到指定邮箱。

## 功能特性

- ✅ **自动化扫描**：每周一自动运行，使用Gemini AI分析亚马逊产品
- ✅ **智能匹配**：根据公司技术栈自动筛选匹配度高的产品
- ✅ **历史去重**：使用Vercel KV存储历史记录，避免重复推荐
- ✅ **自动邮件**：扫描完成后自动发送报告到指定邮箱
- ✅ **密码保护**：访问系统需要管理密码验证
- ✅ **产品数量**：每次扫描10个产品（从6个增加到10个）

## 技术栈

- **前端**：React + Vite + TypeScript + Tailwind CSS
- **后端**：Vercel Serverless Functions
- **定时任务**：Vercel Cron Jobs
- **存储**：Vercel KV（历史记录）
- **AI服务**：Google Gemini API
- **邮件服务**：EmailJS

## 本地开发

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone <your-repo-url>
   cd amazon-product-scout-agent-vercel
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   创建 `.env.local` 文件（仅用于本地开发）：
   ```env
   GEMINI_API_KEY=你的Gemini API密钥
   EMAIL_SERVICE_ID=你的EmailJS Service ID
   EMAIL_TEMPLATE_ID=你的EmailJS Template ID
   EMAIL_PUBLIC_KEY=你的EmailJS Public Key
   EMAIL_PRIVATE_KEY=你的EmailJS Private Key
   ADMIN_PASSWORD=你的管理密码
   RECIPIENT_EMAIL=icyfire.info@gmail.com
   ```

4. **运行开发服务器**
   ```bash
   npm run dev
   ```

   访问 http://localhost:5173

## Vercel部署

### 1. 准备Vercel账户

- 访问 [Vercel](https://vercel.com) 并注册/登录
- 连接你的GitHub账户（推荐）

### 2. 部署项目

#### 方式A：通过Vercel Dashboard

1. 在Vercel Dashboard点击 "New Project"
2. 导入你的GitHub仓库
3. Vercel会自动检测项目配置（Vite）
4. 点击 "Deploy"

#### 方式B：通过Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

### 3. 配置环境变量

在Vercel Dashboard中，进入项目设置 → Environment Variables，添加以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GEMINI_API_KEY` | Google Gemini API密钥 | `AIzaSy...` |
| `EMAIL_SERVICE_ID` | EmailJS Service ID | `service_xxx` |
| `EMAIL_TEMPLATE_ID` | EmailJS Template ID | `template_xxx` |
| `EMAIL_PUBLIC_KEY` | EmailJS Public Key | `user_xxx` |
| `EMAIL_PRIVATE_KEY` | EmailJS Private Key | `xxx` |
| `ADMIN_PASSWORD` | 管理密码（用于访问系统） | `your-secure-password` |
| `RECIPIENT_EMAIL` | 接收报告的邮箱地址 | `icyfire.info@gmail.com` |
| `CRON_SECRET` | （可选）Cron任务安全密钥 | `your-random-secret` |

**重要提示**：
- 所有环境变量都需要添加到 **Production**、**Preview** 和 **Development** 环境
- `ADMIN_PASSWORD` 请使用强密码
- `CRON_SECRET` 是可选的，但建议设置以提高安全性

### 4. 配置Vercel KV（历史记录存储）

1. 在Vercel Dashboard中，进入项目 → Storage
2. 点击 "Create Database" → 选择 "KV"
3. 创建KV数据库（例如：`scout-history`）
4. 在项目设置中，KV会自动连接到项目

**注意**：如果未配置KV，历史记录功能将不可用，但扫描功能仍可正常工作。

### 5. 验证部署

1. 访问你的Vercel部署URL
2. 输入管理密码（`ADMIN_PASSWORD`）
3. 点击"新品扫描"测试功能

## 定时任务配置

项目已配置Vercel Cron Jobs，每周一上午8:00 UTC自动运行扫描任务。

配置文件：`vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-scout",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

如需修改运行时间，编辑 `vercel.json` 中的 `schedule` 字段（使用Cron表达式）。

## 项目结构

```
项目根目录/
├── api/                          # Vercel Serverless Functions
│   ├── cron/
│   │   └── weekly-scout.ts      # 定时任务API
│   ├── auth/
│   │   └── verify.ts             # 密码验证API
│   ├── scout/
│   │   └── run.ts                # 手动触发扫描API
│   └── lib/
│       └── scout.ts              # 核心扫描逻辑
├── components/                   # React组件
│   ├── Dashboard.tsx
│   ├── PasswordModal.tsx        # 密码验证组件
│   └── EmailPreview.tsx
├── services/                     # 服务层
│   ├── geminiService.ts
│   └── emailService.ts
├── vercel.json                   # Vercel配置
├── package.json
└── README.md
```

## API端点

### POST `/api/auth/verify`
验证管理密码

**请求体**：
```json
{
  "password": "your-password"
}
```

**响应**：
```json
{
  "success": true,
  "token": "xxx",
  "expiresAt": 1234567890
}
```

### POST `/api/scout/run`
手动触发产品扫描（需要认证）

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```json
{
  "success": true,
  "message": "扫描完成",
  "report": { ... }
}
```

### GET `/api/cron/weekly-scout`
定时任务端点（由Vercel Cron自动调用）

## 常见问题

### Q: 定时任务没有运行？
A: 检查以下几点：
1. 确认 `vercel.json` 中的Cron配置正确
2. 确认环境变量已正确配置
3. 在Vercel Dashboard的Deployments中查看日志

### Q: 历史记录没有保存？
A: 确认已创建并连接Vercel KV数据库。如果未配置KV，历史记录功能将不可用。

### Q: 邮件发送失败？
A: 检查EmailJS配置：
1. 确认所有EmailJS环境变量已设置
2. 检查EmailJS账户配额
3. 查看Vercel函数日志获取详细错误信息

### Q: 如何修改产品数量？
A: 编辑 `api/lib/scout.ts` 中的 `slice(0, 10)` 部分，将10改为你想要的数字。

## 安全注意事项

1. **密码安全**：使用强密码作为 `ADMIN_PASSWORD`
2. **环境变量**：不要在代码中硬编码敏感信息
3. **Cron Secret**：建议设置 `CRON_SECRET` 以保护定时任务端点
4. **Token过期**：前端token在24小时后过期，需要重新验证

## 许可证

MIT License

## 支持

如有问题，请提交Issue或联系维护者。
