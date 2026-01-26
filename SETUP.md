# Vercel 版本设置指南

## 已完成
✅ 文件已从原项目复制到新文件夹

## 接下来需要手动操作

### 1. 删除 .git 文件夹（如果存在）
在文件资源管理器中，删除 `amazon-product-scout-agent-vercel` 文件夹下的 `.git` 文件夹

### 2. 初始化新的 Git 仓库
在 PowerShell 或 Git Bash 中执行：

```bash
cd l:\FilenPersonal\aitools\amazon-product-scout-agent-vercel
git init
git add .
git commit -m "Initial commit for Vercel version"
```

### 3. 在 GitHub 上创建新仓库
1. 访问 https://github.com/new
2. 创建新仓库（例如：`amazon-scout-vercel`）
3. **不要**初始化 README、.gitignore 或 license

### 4. 连接到 GitHub 仓库
```bash
git remote add origin https://github.com/你的用户名/仓库名.git
git branch -M main
git push -u origin main
```

### 5. 准备 Vercel 迁移
接下来需要：
- 将项目改为 Next.js 或保持 React + Vite 但添加 API routes
- 创建 Vercel 配置文件
- 设置环境变量

## 注意事项
- 这是 Vercel 实验版本，不影响原项目
- 所有敏感信息将存储在 Vercel 环境变量中
