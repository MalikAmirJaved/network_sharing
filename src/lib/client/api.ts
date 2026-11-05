import type { RoomItem } from "@/lib/types";

export class ClientApiError extends Error {
  status: number;
  code: string;
  body: Record<string, unknown> | null;

  constructor(
    status: number,
    code: string,
    message: string,
    body: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  });

  const data = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: string; message?: string })
    | null;

  if (!response.ok) {
    throw new ClientApiError(
      response.status,
      data?.error ?? "request_failed",
      data?.message ?? "The request failed. Please try again.",
      data,
    );
  }

  return data as T;
}

export interface UploadHandle {
  promise: Promise<{ item: RoomItem }>;
  abort: () => void;
}

export function uploadFile(
  code: string,
  file: File,
  options: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {},
): UploadHandle {
  const xhr = new XMLHttpRequest();
  let settled = false;

  const promise = new Promise<{ item: RoomItem }>((resolve, reject) => {
    xhr.open("POST", `/api/rooms/${encodeURIComponent(code)}/upload`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress?.(
          Math.min(99, Math.round((event.loaded / event.total) * 100)),
        );
      }
    };

    xhr.onload = () => {
      settled = true;
      let body: {
        item?: RoomItem;
        error?: string;
        message?: string;
      } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && body?.item) {
        options.onProgress?.(100);
        resolve({ item: body.item });
        return;
      }

      reject(
        new ClientApiError(
          xhr.status,
          body?.error ?? "upload_failed",
          body?.message ?? "Upload failed. Please try again.",
          body as Record<string, unknown> | null,
        ),
      );
    };

    xhr.onerror = () => {
      settled = true;
      reject(
        new ClientApiError(0, "network_error", "Upload failed — check your connection."),
      );
    };

    xhr.onabort = () => {
      settled = true;
      reject(new DOMException("Upload canceled", "AbortError"));
    };

    xhr.onloadend = () => {
      if (!settled) {
        settled = true;
        reject(
          new ClientApiError(
            xhr.status || 0,
            "upload_failed",
            "Upload failed. Please try again.",
          ),
        );
      }
    };

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });

  return { promise, abort: () => xhr.abort() };
}
