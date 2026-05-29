import { describe, expect, it } from "vitest";

import { HttpClient, HttpError } from "../src/scrive/base-client.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("HttpClient", () => {
  it("makes a GET request and parses JSON", async () => {
    const { fetchImpl } = fakeFetch([{ method: "GET", path: "/items/1", response: { id: 1 } }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    const res = await client.request<{ id: number }>({ url: "items/1", method: "GET" });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: 1 });
  });

  it("returns plain text when content-type is not JSON", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "GET", path: "/text", response: "hello", contentType: "text/plain" },
    ]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    const res = await client.request<string>({ url: "text", method: "GET" });
    expect(res.data).toBe("hello");
  });

  it("appends query params to the URL", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "GET", path: "/search", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    await client.request({ url: "search", method: "GET", params: { q: "test", page: "2" } });
    expect(requests[0].url.searchParams.get("q")).toBe("test");
    expect(requests[0].url.searchParams.get("page")).toBe("2");
  });

  it("passes body and headers through as-is", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "POST", path: "/items", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    await client.request({
      url: "items",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "foo" }),
    });
    expect(requests[0].body).toBe('{"name":"foo"}');
    expect(requests[0].headers["content-type"]).toBe("application/json");
  });

  it("sends FormData body as-is", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "POST", path: "/upload", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    const form = new FormData();
    form.append("file", "data");
    await client.request({ url: "upload", method: "POST", body: form });
    expect(requests[0].body).toBeInstanceOf(FormData);
  });

  it("sends URLSearchParams body as-is", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "POST", path: "/token", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    const params = new URLSearchParams({ grant_type: "code" });
    await client.request({ url: "token", method: "POST", body: params });
    expect(requests[0].body).toBeInstanceOf(URLSearchParams);
  });

  it("sends no body when data is undefined", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "GET", path: "/items", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    await client.request({ url: "items", method: "GET" });
    expect(requests[0].body).toBeUndefined();
  });

  it("forwards custom headers", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "GET", path: "/x", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    await client.request({ url: "x", method: "GET", headers: { authorization: "Bearer tok" } });
    expect(requests[0].headers).toEqual({
      authorization: "Bearer tok",
      "x-scrive-app": `scrive-mcp;${__VERSION__}`,
    });
  });

  it("throws HttpError on non-ok response with JSON body", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "GET", path: "/missing", response: { error: "not found" }, status: 404 },
    ]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    const error = await client.request({ url: "missing", method: "GET" }).catch((thrown) => thrown);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.message).toContain("404");
    expect(error.status).toBe(404);
    expect(error.body).toEqual({ error: "not found" });
  });

  it("throws HttpError on non-ok response with text body", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/fail",
        response: "Internal Server Error",
        status: 500,
        contentType: "text/plain",
      },
    ]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    const err = await client.request({ url: "fail", method: "GET" }).catch((thrown) => thrown);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.message).toContain("Internal Server Error");
    expect(err.status).toBe(500);
    expect(err.body).toBe("Internal Server Error");
  });

  it("uses default fetch timeout signal when none provided", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "GET", path: "/x", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    await client.request({ url: "x", method: "GET" });
    expect(requests[0].signal).toBeInstanceOf(AbortSignal);
  });

  it("uses custom signal when provided", async () => {
    const { fetchImpl, requests } = fakeFetch([{ method: "GET", path: "/x", response: {} }]);
    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      authHeader: "test",
      fetchImpl,
    });

    const controller = new AbortController();
    await client.request({ url: "x", method: "GET", signal: controller.signal });
    expect(requests[0].signal).toBe(controller.signal);
  });
});
