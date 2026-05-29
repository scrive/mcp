export interface HttpClientConfig {
  baseUrl: string;
  authHeader: string;
  identifier?: string;
  fetchImpl?: typeof fetch;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export class HttpClient {
  readonly baseUrl: string;
  protected readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    const app = config.identifier
      ? `scrive-mcp;${__VERSION__};${config.identifier}`
      : `scrive-mcp;${__VERSION__}`;
    this.headers = {
      authorization: config.authHeader,
      "x-scrive-app": app,
    };
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async request<T>(config: RequestConfig): Promise<HttpResponse<T>> {
    const url = new URL(config.url, `${this.baseUrl}/`);
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      ...this.headers,
      ...config.headers,
    };

    const response = await this.fetchImpl(url, {
      method: config.method,
      headers,
      body: config.body,
      signal: config.signal ?? AbortSignal.timeout(30_000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? ((await response.json()) as T)
      : ((await response.text()) as T);

    if (!response.ok) {
      throw new HttpError(response.status, data);
    }

    return { status: response.status, data };
  }
}
