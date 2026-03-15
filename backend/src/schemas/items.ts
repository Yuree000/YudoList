// JSON Schema definitions for items route validation.

export const createItemSchema = {
  body: {
    type: 'object',
    properties: {
      text:     { type: 'string', default: '' },
      type:     { type: 'string', enum: ['task', 'heading'], default: 'task' },
      level:    { type: 'integer', minimum: 0, maximum: 4, default: 0 },
      afterId:  { type: 'string' },
      dueDate:   { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      startTime: { type: ['string', 'null'], pattern: '^\\d{2}:\\d{2}$' },
      endTime:   { type: ['string', 'null'], pattern: '^\\d{2}:\\d{2}$' },
      category:  { type: ['string', 'null'], enum: ['学习', '生活', '工作', null] },
    },
    additionalProperties: false,
  },
} as const;

export const updateItemSchema = {
  body: {
    type: 'object',
    minProperties: 1,
    properties: {
      text:      { type: 'string' },
      completed: { type: 'boolean' },
      level:     { type: 'integer', minimum: 0, maximum: 4 },
      type:      { type: 'string', enum: ['task', 'heading'] },
      dueDate:   { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      startTime: { type: ['string', 'null'], pattern: '^\\d{2}:\\d{2}$' },
      endTime:   { type: ['string', 'null'], pattern: '^\\d{2}:\\d{2}$' },
      category:  { type: ['string', 'null'], enum: ['学习', '生活', '工作', null] },
    },
    additionalProperties: false,
  },
} as const;

export const itemIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const reorderSchema = {
  body: {
    type: 'object',
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'orderIndex'],
          properties: {
            id:         { type: 'string' },
            orderIndex: { type: 'number' },
          },
        },
      },
    },
    additionalProperties: false,
  },
} as const;
