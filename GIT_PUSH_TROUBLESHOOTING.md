# Git 推送到 GitHub 故障排除指南

## 常见问题及解决方案

### 问题1：网络连接失败

**错误信息：**
```
fatal: unable to access 'https://github.com/...': Failed to connect to github.com port 443
```

**解决方案：**

#### 方案A：检查并配置代理
```powershell
# 检查当前代理设置
$env:HTTP_PROXY
$env:HTTPS_PROXY

# 如果代理不正确，临时取消
$env:HTTP_PROXY = $null
$env:HTTPS_PROXY = $null

# 然后重试推送
git push origin main
```

#### 方案B：使用SSH方式（推荐）
```powershell
# 1. 检查是否已有SSH密钥
ls ~/.ssh/id_*.pub

# 2. 如果没有，生成SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 3. 将公钥添加到GitHub（Settings -> SSH and GPG keys）

# 4. 更改远程URL为SSH
git remote set-url origin git@github.com:yilinjushi/amazon-product-scount-vercel.git

# 5. 测试连接
ssh -T git@github.com

# 6. 推送
git push origin main
```

### 问题2：权限被拒绝

**错误信息：**
```
fatal: Authentication failed
remote: Permission denied
```

**解决方案：**
1. 使用Personal Access Token（PAT）代替密码
2. 在GitHub Settings -> Developer settings -> Personal access tokens 创建新token
3. 使用token作为密码推送

### 问题3：文件删除未识别

**解决方案：**
```powershell
# 强制添加所有更改（包括删除）
git add -A

# 或者明确删除文件
git rm .github/workflows/deploy_web.yml
git rm .github/workflows/weekly_scout.yml

# 提交
git commit -m "删除不再需要的GitHub Actions工作流（已迁移到Vercel）"

# 推送
git push origin main
```

### 问题4：分支冲突

**错误信息：**
```
error: failed to push some refs
hint: Updates were rejected because the remote contains work that you do not have locally
```

**解决方案：**
```powershell
# 先拉取远程更改
git pull origin main --rebase

# 解决冲突后推送
git push origin main
```

## 推荐的完整推送流程

```powershell
cd l:\FilenPersonal\aitools\amazon-product-scout-agent-vercel

# 1. 检查状态
git status

# 2. 添加所有更改
git add -A

# 3. 检查将要提交的内容
git status

# 4. 提交
git commit -m "删除不再需要的GitHub Actions工作流（已迁移到Vercel）"

# 5. 推送
git push origin main
```

## 如果所有方法都失败

### 使用GitHub Desktop
1. 下载并安装 [GitHub Desktop](https://desktop.github.com/)
2. 打开项目
3. 在界面中提交并推送更改

### 使用GitHub网页界面
1. 访问 https://github.com/yilinjushi/amazon-product-scount-vercel
2. 如果.github/workflows目录为空，GitHub会自动识别删除
3. 或者手动删除这些文件

## 验证推送成功

推送成功后，检查：
1. GitHub仓库页面应该不再显示GitHub Actions错误
2. `.github/workflows/` 目录应该为空或不存在
3. 在GitHub仓库的Actions标签页，应该不再有新的工作流运行
