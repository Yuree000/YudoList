import type { ApiError, ApiResponse } from '../sharedTypes';

const API_BASE = '/api/v1';

let authToken: string | null = null;

export class ApiClientError extends Error {
  constructor(
    public readonly code: number,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'error' in value
  );
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'data' in value
  );
}

export function setApiToken(token: string | null) {
  authToken = token;
}

async function parsePayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError(response.status, 'INVALID_JSON', 'Server returned invalid JSON');
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const payload = await parsePayload(response);

  if (!response.ok) {
    if (isApiError(payload)) {
      throw new ApiClientError(payload.code, payload.error, payload.message);
    }

    throw new ApiClientError(response.status, 'REQUEST_FAILED', 'Request failed');
  }

  if (!isApiResponse<T>(payload)) {
    throw new ApiClientError(response.status, 'INVALID_RESPONSE', 'Unexpected response shape');
  }

  return payload.data;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(path, {
      method: 'DELETE',
    });
  },
};
