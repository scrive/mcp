export interface Route {
  method: string;
  path: string | RegExp;
  status?: number;
  contentType?: string;
  response: unknown;
}

export interface CapturedRequest {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: BodyInit | null | undefined;
  signal: AbortSignal | null | undefined;
}

export function fakeFetch(routes: Route[]): {
  fetchImpl: typeof fetch;
  requests: CapturedRequest[];
} {
  const requests: CapturedRequest[] = [];
  let callIndex = 0;

  const fetchImpl = async (url: URL, init: RequestInit & { method: string }): Promise<Response> => {
    const { method } = init;

    if (callIndex >= routes.length) {
      throw new Error(
        `Unexpected call #${callIndex + 1}: ${method} ${url.pathname} (only ${routes.length} route(s) expected)`,
      );
    }

    const route = routes[callIndex];
    const pathMatch =
      typeof route.path === "string" ? url.pathname === route.path : route.path.test(url.pathname);

    if (route.method !== method || !pathMatch) {
      throw new Error(
        `Call #${callIndex + 1}: expected ${route.method} ${route.path}, got ${method} ${url.pathname}`,
      );
    }

    requests.push({
      method,
      url,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body,
      signal: init.signal,
    });

    callIndex++;

    const contentType = route.contentType ?? "application/json";
    const body = contentType.includes("application/json")
      ? JSON.stringify(route.response)
      : (route.response as string);

    return new Response(body, {
      status: route.status ?? 200,
      headers: { "content-type": contentType },
    });
  };

  return { fetchImpl: fetchImpl as typeof fetch, requests };
}
