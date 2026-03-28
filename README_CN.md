# YudoList

YudoList 是一个以键盘操作为核心的全栈待办应用，使用 React、Fastify、Prisma 和 SQLite 构建。

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS 4
- 后端：Fastify 5、TypeScript、Prisma
- 数据库：SQLite
- 认证：JWT
- AI：Moonshot / Kimi（可选）

## 启动方式

仓库现在只保留一种启动方式：

- 启动：`start.bat`
- 停止：`stop.bat`

`start.bat` 会自动完成这些事情：

1. 如果没有 `backend/.env`，就从 `backend/.env.example` 自动创建
2. 如果缺少依赖，就自动安装前后端依赖
3. 自动执行 Prisma client 生成和 `prisma db push`
4. 在后台静默启动前后端
5. 自动打开 [http://localhost:3000](http://localhost:3000)

如果浏览器没有自动弹出，手动打开 [http://localhost:3000](http://localhost:3000) 即可。

## 环境要求

- Windows
- Node.js 18 及以上
- npm 9 及以上

## 后端环境变量

请编辑 `backend/.env.example`，真实密钥只放在你本地的 `backend/.env`。

变量包括：

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`
- `MOONSHOT_API_KEY`

## AI 配置说明

AI 功能是可选的。

- `MOONSHOT_API_KEY` 为空时，除 AI 外的其他功能都能正常使用
- 真实 API Key 只放在本地 `backend/.env`
- 不要提交 `backend/.env`
- 仓库中只提交留空的 `backend/.env.example`

## 排查方式

- 如果启动状态异常，先执行 `stop.bat`，再执行 `start.bat`
- 后端健康检查地址：[http://localhost:3001/health](http://localhost:3001/health)
- 如果 AI 不可用，先检查本地 `backend/.env` 中是否正确填写了 `MOONSHOT_API_KEY`

## License

MIT
