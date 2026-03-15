import { FileText, MoonStar, Sparkles } from 'lucide-react';

export const noteCards = [
  {
    title: '状态持久保存',
    description: '登录令牌与主题偏好在刷新后自动恢复，重新打开即是上次离开的样子。',
    icon: Sparkles,
  },
  {
    title: '清单已连接服务器',
    description: '登录后，所有条目从后端实时拉取，新增、修改、删除均自动同步。',
    icon: FileText,
  },
  {
    title: '深色模式随时就绪',
    description: '跟随系统偏好或手动切换，暖色调配色在明暗模式下均保持精心调校的对比度。',
    icon: MoonStar,
  },
] as const;
