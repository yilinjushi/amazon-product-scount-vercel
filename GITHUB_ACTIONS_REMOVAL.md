# GitHub Actions 工作流删除说明

## 已删除的文件

以下 GitHub Actions 工作流文件已被删除，因为项目已迁移到 Vercel：

1. `.github/workflows/deploy_web.yml` - GitHub Pages 部署工作流
   - 原因：部署现在由 Vercel 处理

2. `.github/workflows/weekly_scout.yml` - 定时任务工作流
   - 原因：定时任务现在由 Vercel Cron Jobs 处理（在 `vercel.json` 中配置）

## 提交更改

请执行以下命令提交并推送这些更改：

```bash
git add .github/workflows/
git commit -m "删除不再需要的GitHub Actions工作流（已迁移到Vercel）"
git push origin main
```

## 验证

推送后，GitHub Actions 将不再运行，之前的错误信息会消失。

所有功能现在都由 Vercel 处理：
- ✅ 部署：Vercel 自动部署
- ✅ 定时任务：Vercel Cron Jobs（每周一上午8:00 UTC）
