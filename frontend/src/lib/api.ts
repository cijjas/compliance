const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export const API_BASE = API_URL;

type ApiRequestInit = RequestInit & {
  redirectOnUnauthorized?: boolean;
};

function getStoredToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function clearStoredAuth() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getErrorMessage(res: Response) {
  const body = await res
    .json()
    .catch(() => ({ message: res.statusText }));

  if (typeof body.message === "string") {
    return body.message;
  }

  if (Array.isArray(body.message)) {
    return body.message.join(", ");
  }

  return res.statusText;
}

export async function authenticatedFetch(
  path: string,
  options: ApiRequestInit = {},
): Promise<Response> {
  const { redirectOnUnauthorized = true, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const token = getStoredToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers,
  });

  if (!res.ok) {
    if (
      res.status === 401 &&
      redirectOnUnauthorized &&
      typeof window !== "undefined"
    ) {
      clearStoredAuth();
      window.location.href = "/login";
    }

    throw new ApiError(res.status, await getErrorMessage(res));
  }

  return res;
}

async function request<T>(
  path: string,
  options: ApiRequestInit = {},
): Promise<T> {
  const res = await authenticatedFetch(path, options);

  if (res.status === 204) {
    return undefined as T;
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as T;
  }

  const bodyText = await res.text();
  if (!bodyText) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return JSON.parse(bodyText) as T;
  }

  return bodyText as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  postPublic: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirectOnUnauthorized: false,
    }),

  download: (path: string, options: RequestInit = {}) =>
    authenticatedFetch(path, options).then((res) => res.blob()),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, {
      method: "POST",
      body: formData,
    }),
};

export { ApiError };
