"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadFile } from "@/lib/client/api";
import type { RoomItem } from "@/lib/types";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "done"
  | "error"
  | "canceled";

export interface UploadTask {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useUploads(
  code: string,
  onUploaded: (item: RoomItem) => void,
  onError: (message: string) => void,
) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const queue = useRef<{ id: string; file: File }[]>([]);
  const files = useRef(new Map<string, File>());
  const aborts = useRef(new Map<string, AbortController>());
  const running = useRef(false);

  const uploadedRef = useRef(onUploaded);
  const errorRef = useRef(onError);

  useEffect(() => {
    uploadedRef.current = onUploaded;
    errorRef.current = onError;
  }, [onUploaded, onError]);

  const patch = useCallback(
    (id: string, changes: Partial<UploadTask>) => {
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, ...changes } : task)),
      );
    },
    [],
  );

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      while (queue.current.length > 0) {
        const next = queue.current.shift()!;
        const file = files.current.get(next.id);
        if (!file) continue;

        const controller = new AbortController();
        aborts.current.set(next.id, controller);
        patch(next.id, { status: "uploading", progress: 0, error: undefined });

        try {
          const { item } = await uploadFile(code, file, {
            signal: controller.signal,
            onProgress: (progress) => patch(next.id, { progress }),
          }).promise;

          patch(next.id, { status: "done", progress: 100 });
          files.current.delete(next.id);
          uploadedRef.current(item);
        } catch (error) {
          if (controller.signal.aborted) {
            patch(next.id, { status: "canceled" });
          } else {
            const message =
              error instanceof Error ? error.message : "Upload failed";
            patch(next.id, { status: "error", error: message });
            errorRef.current(message);
          }
        } finally {
          aborts.current.delete(next.id);
        }
      }
    } finally {
      running.current = false;
    }
  }, [code, patch]);

  const enqueue = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming).filter((file) => file.size >= 0);
      if (list.length === 0) return;

      const entries = list.map((file) => {
        const id = uid();
        files.current.set(id, file);
        return { id, file };
      });

      setTasks((current) => [
        ...current,
        ...entries.map(({ id, file }) => ({
          id,
          name: file.name || "pasted-image.png",
          size: file.size,
          progress: 0,
          status: "queued" as const,
        })),
      ]);

      queue.current.push(...entries);
      void pump();
    },
    [pump],
  );

  const cancel = useCallback(
    (id: string) => {
      aborts.current.get(id)?.abort();
      queue.current = queue.current.filter((entry) => entry.id !== id);
      patch(id, { status: "canceled" });
    },
    [patch],
  );

  const retry = useCallback(
    (id: string) => {
      const file = files.current.get(id);
      if (!file) return;
      patch(id, { status: "queued", progress: 0, error: undefined });
      queue.current.push({ id, file });
      void pump();
    },
    [patch, pump],
  );

  const dismiss = useCallback(
    (id: string) => {
      aborts.current.get(id)?.abort();
      queue.current = queue.current.filter((entry) => entry.id !== id);
      files.current.delete(id);
      setTasks((current) => current.filter((task) => task.id !== id));
    },
    [],
  );

  const clearFinished = useCallback(() => {
    setTasks((current) =>
      current.filter(
        (task) => task.status !== "done" && task.status !== "canceled",
      ),
    );
  }, []);

  useEffect(() => {
    const controllers = aborts.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
    };
  }, []);

  return { tasks, enqueue, cancel, retry, dismiss, clearFinished };
}
