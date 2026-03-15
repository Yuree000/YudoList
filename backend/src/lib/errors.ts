export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorResponse(statusCode: number, message: string, errorCode: string) {
  return {
    code: statusCode,
    message,
    error: errorCode,
  };
}
