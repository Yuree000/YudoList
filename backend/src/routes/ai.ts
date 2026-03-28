import type { FastifyInstance } from 'fastify';
import { errorResponse } from '../lib/errors';
import { getLocalToday } from '../lib/localDate';
import { authenticate } from '../middleware/auth';

const KIMI_BASE = 'https://api.moonshot.cn/v1';
const KIMI_MODEL = 'moonshot-v1-8k';
const MOONSHOT_PLACEHOLDER = 'your-kimi-api-key-here';

const MANAGE_FUNCTION = {
  name: 'manage_todos',
  description: '根据用户的自然语言描述，输出需要新建、标记完成、或删除的待办事项',
  parameters: {
    type: 'object',
    properties: {
      creates: {
        type: 'array',
        description: '需要新建的任务列表',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '任务文本，简洁描述事项本身，不含日期或时间' },
            dueDate: { type: 'string', description: '日期，格式 YYYY-MM-DD，无日期时省略' },
            startTime: {
              type: 'string',
              description: '开始时间，格式 HH:MM（24小时制），无则省略',
            },
            endTime: {
              type: 'string',
              description: '结束时间，格式 HH:MM（24小时制），无则省略',
            },
            category: {
              type: 'string',
              enum: ['学习', '生活', '工作'],
              description: '分类，无法判断时省略',
            },
            type: { type: 'string', enum: ['task', 'heading'], description: '默认 task' },
          },
          required: ['text', 'type'],
        },
      },
      completes: {
        type: 'array',
        description:
          '需要标记为已完成的任务 ID 列表。用于用户说"完成了""做完了""已经完成"等表达。ID 必须来自现有任务列表，不能编造',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '现有任务的 id' },
          },
          required: ['id'],
        },
      },
      deletes: {
        type: 'array',
        description:
          '需要永久删除的任务 ID 列表。仅用于用户明确说"删除""去掉""移除"等表达，不可与 completes 混用。ID 必须来自现有任务列表，不能编造',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '现有任务的 id' },
          },
          required: ['id'],
        },
      },
    },
    required: ['creates', 'completes', 'deletes'],
  },
};

interface CurrentItem {
  id: string;
  text: string;
  dueDate: string | null;
  startTime: string | null;
  endTime: string | null;
  category: string | null;
  completed: boolean;
}

export default async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post<{ Body: { input: string; currentItems?: CurrentItem[] } }>(
    '/parse',
    {
      schema: {
        body: {
          type: 'object',
          required: ['input'],
          properties: {
            input: { type: 'string', minLength: 1 },
            currentItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  dueDate: { type: ['string', 'null'] },
                  startTime: { type: ['string', 'null'] },
                  endTime: { type: ['string', 'null'] },
                  category: { type: ['string', 'null'] },
                  completed: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const apiKey = process.env.MOONSHOT_API_KEY?.trim();
      if (!apiKey || apiKey === MOONSHOT_PLACEHOLDER) {
        return reply
          .status(500)
          .send(errorResponse(500, 'MOONSHOT_API_KEY not configured', 'AI_NOT_CONFIGURED'));
      }

      const today = getLocalToday();
      const currentItems = request.body.currentItems ?? [];
      const itemsContext =
        currentItems.length > 0
          ? `\n\n当前任务列表（可用于完成或删除）：\n${currentItems
              .map((item) => {
                const parts = [item.id, `"${item.text}"`];
                if (item.dueDate) parts.push(item.dueDate);
                if (item.startTime || item.endTime) {
                  parts.push(`${item.startTime ?? ''}–${item.endTime ?? ''}`);
                }
                if (item.category) parts.push(item.category);
                if (item.completed) parts.push('已完成');
                return parts.join(' ');
              })
              .join('\n')}`
          : '';

      const systemPrompt = `今天是 ${today}。你是任务管理助手，根据用户的自然语言指令，调用 manage_todos 函数。${itemsContext}

规则：
1. 同一件事发生在多个日期，每个日期单独创建一条，文本保持一致。
2. 时间约束（开始/结束时间）是任务属性，填入 startTime/endTime，不要单独创建任务。
3. text 只写事项本身，不含日期或时间。
4. 相对日期推算：今天 = ${today}，明天 +1 天，后天 +2 天，下周一 = 下一个周一，以此类推。有明确日期信息的任务必须填写 dueDate。
5. 时间统一为 24 小时制 HH:MM。
6. 严格区分"完成"与"删除"：
   - 用户说"完成了/做完了/已完成/打勾" → 放入 completes（标记完成，任务仍保留）
   - 用户说"删除/去掉/移除/不要了" → 放入 deletes（永久删除）
   - 不可将"完成"误判为"删除"
7. completes 和 deletes 的 id 只能使用现有任务列表中的 id，不能编造。
8. 不需要某个操作时，对应数组返回空数组。`;

      const response = await fetch(`${KIMI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: KIMI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: request.body.input },
          ],
          tools: [{ type: 'function', function: MANAGE_FUNCTION }],
          tool_choice: { type: 'function', function: { name: 'manage_todos' } },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        request.log.error({ status: response.status, body }, 'Kimi API error');
        return reply.status(502).send(errorResponse(502, 'AI service error', 'AI_SERVICE_ERROR'));
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            tool_calls?: Array<{ function: { arguments: string } }>;
          };
        }>;
      };

      const toolCall = data.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return reply
          .status(502)
          .send(errorResponse(502, 'No tool call returned', 'AI_SERVICE_ERROR'));
      }

      let parsed: {
        creates: Array<{
          text: string;
          dueDate?: string;
          startTime?: string;
          endTime?: string;
          category?: '学习' | '生活' | '工作';
          type: 'task' | 'heading';
        }>;
        completes: Array<{ id: string }>;
        deletes: Array<{ id: string }>;
      };

      try {
        parsed = JSON.parse(toolCall.function.arguments) as typeof parsed;
      } catch {
        return reply
          .status(502)
          .send(errorResponse(502, 'AI returned invalid JSON', 'AI_SERVICE_ERROR'));
      }

      const validIds = new Set(currentItems.map((item) => item.id));
      const safeCompletes = (parsed.completes ?? []).filter((entry) => validIds.has(entry.id));
      const safeDeletes = (parsed.deletes ?? []).filter((entry) => validIds.has(entry.id));
      const creates = (parsed.creates ?? []).map((item) => ({
        text: item.text,
        dueDate: item.dueDate ?? null,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        category: item.category ?? null,
        type: item.type,
      }));

      return reply.send({
        code: 200,
        message: 'AI parse complete',
        data: {
          creates,
          completes: safeCompletes,
          deletes: safeDeletes,
        },
      });
    },
  );
}
