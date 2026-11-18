const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
).replace(/\/+$/, '');

const TOKENS_KEY = 'nexora.tokens.v1';
const REQUEST_TIMEOUT_MS = 12_000;

export interface StoredTokens {
  access: string;
  refresh: string;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getTokens(): StoredTokens | null {
  try {
    const raw = window.localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    if (
      typeof parsed.access === 'string' &&
      parsed.access &&
      typeof parsed.refresh === 'string' &&
      parsed.refresh
    ) {
      return { access: parsed.access, refresh: parsed.refresh };
    }
    return null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: StoredTokens): void {
  try {
    window.localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // The in-memory session still works if storage is unavailable.
  }
}

export function clearTokens(): void {
  try {
    window.localStorage.removeItem(TOKENS_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (!payload || typeof payload !== 'object') return fallback;

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === 'string' && record.detail.trim()) {
    return record.detail;
  }

  for (const value of Object.values(record)) {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return fallback;
}

async function parsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refresh) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) clearTokens();
      return null;
    }

    const data = (await response.json()) as {
      access?: string;
      refresh?: string;
    };
    if (!data.access) return null;

    setTokens({
      access: data.access,
      refresh: data.refresh ?? tokens.refresh,
    });
    return data.access;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
}

async function send(
  path: string,
  options: RequestOptions,
  accessToken?: string,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const authenticated = options.authenticated ?? true;
  let accessToken = authenticated ? getTokens()?.access : undefined;

  let response = await send(path, options, accessToken);

  if (response.status === 401 && authenticated) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = refreshed;
      response = await send(path, options, accessToken);
    }
  }

  const payload = await parsePayload(response);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(payload, `Request failed with status ${response.status}.`),
      payload,
    );
  }

  return payload as T;
}

/** True for connection failures, timeouts, and upstream 5xx errors. */
export function isBackendUnavailable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return error instanceof TypeError;
}
