// JSON Schema definitions for auth route validation.

export const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 2, maxLength: 50 },
      email:    { type: 'string', format: 'email', maxLength: 100 },
      password: { type: 'string', minLength: 6, maxLength: 128 },
    },
    additionalProperties: false,
  },
} as const;

export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email:    { type: 'string', format: 'email', maxLength: 100 },
      password: { type: 'string' },
    },
    additionalProperties: false,
  },
} as const;
