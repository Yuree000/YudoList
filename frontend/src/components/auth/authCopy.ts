import { BookText, PencilLine, ShieldCheck } from 'lucide-react';

export const featureRows = [
  {
    title: '以编辑的速度捕获想法',
    description: '为习惯用大纲思考而非弹窗打断的人，提供一个沉静的书写界面。',
    icon: PencilLine,
  },
  {
    title: '随时回到中断的地方',
    description: '登录状态与主题偏好跨页面刷新持久保存，重新打开即刻就绪。',
    icon: ShieldCheck,
  },
  {
    title: '暖色调，清晰的层级感',
    description: '杂志式排版与克制的间距，让密集信息保持清晰易读。',
    icon: BookText,
  },
] as const;

export const modeCopy = {
  login: {
    title: '回到你的清单',
    blurb: '登录后，之前保存在服务器上的所有条目将自动加载。',
    action: '进入工作台',
  },
  register: {
    title: '开启一本新账本',
    blurb: '注册新账号，你的清单、主题偏好和所有数据都会安全存储。',
    action: '创建账号',
  },
} as const;
