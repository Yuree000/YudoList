<div align="center">

# YudoList

**[中文](#中文) | [English](#english)**

</div>

---

## 中文

> You Do, You List — 追求极致录入体验的结构化待办清单。

YudoList 是一个全栈 Web 待办清单应用，核心体验围绕键盘优先设计。操作感像文本编辑器，却能把工作梳理得井然有序。零干扰，零多余。

### 功能特性

- **键盘原生操作**：回车新建、Tab 缩进、Shift+Tab 提升层级、Backspace 删除空行
- **拖拽排序**：流畅的拖拽体验，带虚线占位符视觉反馈
- **分组标题**：输入 `/h` + 回车即可创建分组标题
- **完成项自动沉底**：勾选完成后任务自动带动画滑到列表底部
- **日历视图**：按日期筛选条目，预设未来计划、回顾过往工作
- **全文搜索**：Ctrl+K 聚焦搜索框，实时过滤
- **批量选择与删除**：多选模式，一键批量删除
- **撤销 / 重做**：基于命令模式的完整撤销历史（Ctrl+Z / Ctrl+Shift+Z）
- **深色模式**：跟随系统 / 强制亮色 / 强制深色，带平滑过渡动画
- **乐观更新**：每次操作即时生效，数据同步静默在后台进行
- **分类标签**：为任务打上学习 / 生活 / 工作标签
- **截止日期与时间段**：为每条任务设置日期及开始/结束时间
- **循环事件**：一次性创建跨多个日期的重复任务
- **近两周完成图表**：可视化柱状图展示每日完成记录
- **🤖 AI 自然语言解析**：用自然语言描述计划，AI 自动创建、完成或删除任务（基于 Kimi / Moonshot）

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、TypeScript、Vite、Tailwind CSS 4 |
| 动画 | Framer Motion |
| 拖拽 | @dnd-kit |
| 状态管理 | Zustand |
| 后端 | Fastify 5、TypeScript |
| 数据库 | Prisma ORM + SQLite（开发）/ PostgreSQL（生产） |
| 认证 | JWT + bcrypt |
| AI | Kimi（Moonshot）API — Function Calling |

### 快速开始

**环境要求**：Node.js ≥ 18、npm ≥ 9

```bash
# 后端
cd backend
npm install
cp .env.example .env        # 填写 JWT_SECRET，AI 功能需填写 MOONSHOT_API_KEY
npm run db:generate
npm run db:push
npm run dev                 # http://localhost:3001

# 前端
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

### 环境变量

| 变量 | 说明 | 是否必填 |
|------|------|----------|
| `DATABASE_URL` | Prisma 数据库连接 URL | ✅ |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改） | ✅ |
| `JWT_EXPIRES_IN` | Token 有效期（默认 `7d`） | ✅ |
| `PORT` | 后端监听端口（默认 `3001`） | ✅ |
| `CORS_ORIGIN` | 允许的前端跨域地址 | ✅ |
| `MOONSHOT_API_KEY` | Kimi API Key，用于 AI 自然语言解析（[获取](https://platform.moonshot.cn/)） | 可选 |

> 不填写 `MOONSHOT_API_KEY` 时，应用其余功能完全正常，仅 AI 面板会提示错误。

### 键盘快捷键

| 按键 | 操作 |
|------|------|
| Enter | 在当前行下方新建条目 |
| Tab | 增加缩进（最多 4 级） |
| Shift + Tab | 减少缩进 |
| Backspace（空行） | 删除当前条目 |
| `/h` + Enter | 转换为分组标题 |
| Ctrl/Cmd + Z | 撤销 |
| Ctrl/Cmd + Shift + Z | 重做 |
| Ctrl/Cmd + K | 聚焦搜索栏 |

### 开源协议

MIT

---

## English

> You Do, You List — A structured to-do list built for speed and clarity.

YudoList is a full-stack web application designed around keyboard-first workflows. It feels like a text editor but organizes your work. No friction, no clutter.

### Features

- **Keyboard-native**: Enter to create, Tab/Shift+Tab to indent, Backspace to delete empty rows
- **Drag to reorder**: Smooth drag-and-drop with visual placeholder feedback
- **Headings**: Type `/h` + Enter to create a section heading
- **Auto-sink completed items**: Finished tasks move to the bottom automatically with animation
- **Calendar view**: Filter items by date; plan future work and review past tasks
- **Full-text search**: Ctrl+K to focus, live filtering as you type
- **Bulk select & delete**: Multi-select mode with one-click bulk delete
- **Undo / Redo**: Full command-pattern undo history (Ctrl+Z / Ctrl+Shift+Z)
- **Dark mode**: Follow system, force light, or force dark — smooth CSS transition
- **Optimistic updates**: Every action feels instant; sync happens silently in the background
- **Category labels**: Tag items as Study / Life / Work
- **Deadlines & time slots**: Set due dates and start/end times per item
- **Recurring events**: Create repeating tasks across multiple dates at once
- **14-day activity chart**: Visual bar chart of your daily completion history
- **🤖 AI natural language parser**: Describe your plans in plain text; AI creates, completes, or deletes tasks automatically (powered by Kimi / Moonshot)

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Animation | Framer Motion |
| Drag & Drop | @dnd-kit |
| State | Zustand |
| Backend | Fastify 5, TypeScript |
| Database | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT + bcrypt |
| AI | Kimi (Moonshot) API — function calling |

### Quick Start

**Prerequisites**: Node.js ≥ 18, npm ≥ 9

```bash
# Backend
cd backend
npm install
cp .env.example .env        # fill in JWT_SECRET and optionally MOONSHOT_API_KEY
npm run db:generate
npm run db:push
npm run dev                 # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Prisma database URL | ✅ |
| `JWT_SECRET` | Secret key for signing JWT tokens | ✅ |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) | ✅ |
| `PORT` | Backend port (default: `3001`) | ✅ |
| `CORS_ORIGIN` | Allowed frontend origin | ✅ |
| `MOONSHOT_API_KEY` | Kimi API key for AI parsing ([get one](https://platform.moonshot.cn/)) | Optional |

> Without `MOONSHOT_API_KEY` the app works fully — only the AI panel will return an error.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Create item below current |
| Tab | Indent (max level 4) |
| Shift + Tab | Outdent |
| Backspace (empty row) | Delete item |
| `/h` + Enter | Convert to heading |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + K | Focus search bar |

### License

MIT
