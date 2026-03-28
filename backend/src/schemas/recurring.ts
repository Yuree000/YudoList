export const recurringSeriesBodySchema = {
  body: {
    type: 'object',
    required: ['text', 'startDate', 'endDate', 'weekdaysMask'],
    properties: {
      text: { type: 'string', minLength: 1, maxLength: 200 },
      startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      endDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      weekdaysMask: { type: 'integer', minimum: 1, maximum: 127 },
      category: { type: ['string', 'null'], enum: ['学习', '生活', '工作', null] },
      startTime: { type: ['string', 'null'], pattern: '^\\d{2}:\\d{2}$' },
      endTime: { type: ['string', 'null'], pattern: '^\\d{2}:\\d{2}$' },
    },
    additionalProperties: false,
  },
} as const;

export const recurringIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;
