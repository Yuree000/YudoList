import type { ApiError, ApiResponse } from '../sharedTypes';

const API_BASE = '/api/v1';

let authToken: string | null = null;

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

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

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { timeoutMs, signal: externalSignal, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);

  if (requestInit.body && !(requestInit.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const controller = timeoutMs ? new AbortController() : null;
  const signal = controller?.signal ?? externalSignal;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let removeAbortListener: (() => void) | null = null;

  if (controller && externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      const abortRequest = () => controller.abort();
      externalSignal.addEventListener('abort', abortRequest, { once: true });
      removeAbortListener = () => externalSignal.removeEventListener('abort', abortRequest);
    }
  }

  if (controller) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...requestInit,
      headers,
      signal,
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
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(408, 'REQUEST_TIMEOUT', 'Request timed out');
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    removeAbortListener?.();
  }
}

export const api = {
  get<T>(path: string, init?: RequestOptions) {
    return request<T>(path, init);
  },
  post<T>(path: string, body?: unknown, init?: RequestOptions) {
    return request<T>(path, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown, init?: RequestOptions) {
    return request<T>(path, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown, init?: RequestOptions) {
    return request<T>(path, {
      ...init,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, init?: RequestOptions) {
    return request<T>(path, {
      ...init,
      method: 'DELETE',
    });
  },
};
