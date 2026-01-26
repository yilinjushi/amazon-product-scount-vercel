# Git 推送到 GitHub 脚本
# 使用方法：在PowerShell中运行 .\push-to-github.ps1

Write-Host "=== Git 推送到 GitHub ===" -ForegroundColor Cyan
Write-Host ""

# 切换到项目目录
$projectPath = "l:\FilenPersonal\aitools\amazon-product-scout-agent-vercel"
Set-Location $projectPath

# 1. 检查git状态
Write-Host "1. 检查Git状态..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "2. 添加所有更改（包括删除的文件）..." -ForegroundColor Yellow
git add -A

Write-Host ""
Write-Host "3. 检查暂存区状态..." -ForegroundColor Yellow
git status --short

Write-Host ""
$confirm = Read-Host "是否继续提交？(Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "已取消操作" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "4. 提交更改..." -ForegroundColor Yellow
git commit -m "删除不再需要的GitHub Actions工作流（已迁移到Vercel）"

if ($LASTEXITCODE -ne 0) {
    Write-Host "提交失败或没有更改需要提交" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "5. 尝试推送到GitHub..." -ForegroundColor Yellow

# 尝试取消代理设置（如果存在）
$env:HTTP_PROXY = $null
$env:HTTPS_PROXY = $null

git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 推送成功！" -ForegroundColor Green
    Write-Host "GitHub Actions工作流已删除，错误应该消失了。" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ 推送失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的解决方案：" -ForegroundColor Yellow
    Write-Host "1. 检查网络连接" -ForegroundColor White
    Write-Host "2. 使用SSH方式：git remote set-url origin git@github.com:yilinjushi/amazon-product-scount-vercel.git" -ForegroundColor White
    Write-Host "3. 使用GitHub Desktop等图形工具" -ForegroundColor White
    Write-Host "4. 查看 GIT_PUSH_TROUBLESHOOTING.md 获取详细帮助" -ForegroundColor White
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
