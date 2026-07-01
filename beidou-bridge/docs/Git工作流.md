# Git 工作流

> **仓库**：https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge

## 分支约定

| 分支 | 用途 | 是否受保护 |
|------|------|------------|
| **`master`** | 稳定/可发布版本，仅通过合并进入 | 是（不直接 push） |
| **`develop`** | 日常开发集成分支 | 否 |
| **`feature/*`** | 功能开发（可选） | 否 |

本地默认跟踪：`main` → 远程 `origin/master`（历史原因，与 `master` 同义）。

---

## 标准流程（必须遵守）

```
feature/xxx 或 develop 上开发
    → push 到远程分支
    → 合并到 master（Gitea Web 或本地 merge）
    → push master
```

**禁止**：未经 review/测试，直接把新提交 push 到 `origin/master`。

---

## 日常开发（在 develop 上）

```powershell
cd beidou-bridge

# 1. 切到 develop 并更新
git checkout develop
git pull origin develop

# 2. 开发、提交
git add .
git commit -m "feat: your change description"

# 3. 先推到 develop 分支
$env:GIT_SSL_NO_VERIFY = "true"
git push origin develop
```

---

## 功能分支（较大改动时）

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/beidou-register-vehicleids

# 开发提交...
git push -u origin feature/beidou-register-vehicleids

# 完成后合并到 develop，再按下方流程合并到 master
```

---

## 合并到 master（发布）

### 方式 A：Gitea Web（推荐）

1. 打开仓库 → **Pull Requests / 合并请求**
2. 源分支：`develop`（或 `feature/xxx`）→ 目标：`master`
3. 确认 diff、CI（若有）后合并

### 方式 B：本地合并

```powershell
git checkout main          # 跟踪 origin/master
git pull origin master

git merge develop --no-ff -m "merge: develop into master"
npm run build              # 合并前建议编译通过

$env:GIT_SSL_NO_VERIFY = "true"
git push origin main:master
```

---

## 提交信息规范

```
feat: 新功能
fix: 修复
docs: 文档
refactor: 重构
chore: 构建/工具
merge: 分支合并
```

示例：`feat: batch query cloud device status in one HTTP call per push cycle`

---

## 首次克隆后

```powershell
git clone https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge.git
cd Beidou_bridge
git checkout develop
```
