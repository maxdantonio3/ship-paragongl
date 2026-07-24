"use client";

import { useEffect, useRef, useState } from "react";
import type { FilterMode, Point } from "@/lib/scanner/types";

export interface ProcessOptions {
  corners: Point[] | null;
  rotation: 0 | 90 | 180 | 270;
  filterMode: FilterMode;
  brightness: number;
  contrast: number;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
}

interface PendingEntry {
  kind: "process" | "commitCrop";
  resolve: (value: ProcessResult) => void;
  reject: (err: Error) => void;
}

const READY_TIMEOUT_MS = 10000;

/**
 * Main-thread side of scanner-worker.worker.ts. The worker itself has zero
 * external dependencies (no WASM, no CDN script) — it's ready essentially
 * instantly, so this client is deliberately simple compared to what an
 * engine-loading version would need.
 */
export class ScannerWorkerClient {
  private worker: Worker;
  private pending = new Map<string, PendingEntry>();
  private nextId = 0;
  public ready = false;
  public failed = false;
  private lastError: string | null = null;
  private readyCallbacks: (() => void)[] = [];
  private errorCallbacks: ((err: string) => void)[] = [];
  private readyTimeout: ReturnType<typeof setTimeout>;

  constructor() {
    this.worker = new Worker(new URL("./scanner-worker.worker.ts", import.meta.url));

    this.worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;

      if (msg.type === "ready") {
        clearTimeout(this.readyTimeout);
        this.ready = true;
        this.failed = false;
        this.lastError = null;
        this.readyCallbacks.forEach((cb) => cb());
        this.readyCallbacks = [];
        return;
      }

      if (msg.type === "error" && msg.id === undefined) {
        this.fail(msg.error);
        return;
      }

      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);

      if (msg.type === "error") {
        entry.reject(new Error(msg.error));
      } else {
        entry.resolve({ blob: msg.blob, width: msg.width, height: msg.height });
      }
    };

    this.worker.onerror = (e: ErrorEvent) => {
      this.fail(e.message || "The image-processing worker failed to start.");
    };

    this.readyTimeout = setTimeout(() => {
      if (!this.ready) {
        this.fail("Timed out waiting for the image-processing worker to start.");
      }
    }, READY_TIMEOUT_MS);

    this.worker.postMessage({ type: "init" });
  }

  private fail(message: string) {
    if (this.failed) return;
    this.failed = true;
    this.lastError = message;
    clearTimeout(this.readyTimeout);
    this.errorCallbacks.forEach((cb) => cb(message));
    this.pending.forEach((entry) => entry.reject(new Error(message)));
    this.pending.clear();
  }

  onReady(cb: () => void) {
    if (this.ready) cb();
    else this.readyCallbacks.push(cb);
  }

  onError(cb: (err: string) => void) {
    if (this.failed && this.lastError) cb(this.lastError);
    else this.errorCallbacks.push(cb);
  }

  private call(type: string, payload: Record<string, unknown>, bitmap: ImageBitmap, kind: PendingEntry["kind"]) {
    if (this.failed) {
      return Promise.reject(new Error("The image-processing engine failed to load."));
    }
    const id = String(this.nextId++);
    return new Promise<ProcessResult>((resolve, reject) => {
      this.pending.set(id, { kind, resolve, reject });
      this.worker.postMessage({ id, type, bitmap, ...payload }, [bitmap]);
    });
  }

  process(bitmap: ImageBitmap, options: ProcessOptions, quality?: number): Promise<ProcessResult> {
    return this.call("process", { options, quality }, bitmap, "process");
  }

  commitCrop(bitmap: ImageBitmap, corners: Point[], rotation: 0 | 90 | 180 | 270): Promise<ProcessResult> {
    return this.call("commitCrop", { corners, rotation }, bitmap, "commitCrop");
  }

  terminate() {
    clearTimeout(this.readyTimeout);
    this.worker.terminate();
  }
}

// One worker for the whole scanner session.
let sharedClient: ScannerWorkerClient | null = null;

export function resetScannerWorker() {
  sharedClient?.terminate();
  sharedClient = null;
}

export function useScannerWorker() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<ScannerWorkerClient | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sharedClient) sharedClient = new ScannerWorkerClient();
    clientRef.current = sharedClient;
    sharedClient.onReady(() => {
      setReady(true);
      setError(null);
    });
    sharedClient.onError((err) => setError(err));
  }, []);

  function retry() {
    resetScannerWorker();
    setReady(false);
    setError(null);
    sharedClient = new ScannerWorkerClient();
    clientRef.current = sharedClient;
    sharedClient.onReady(() => {
      setReady(true);
      setError(null);
    });
    sharedClient.onError((err) => setError(err));
  }

  return { client: clientRef.current, ready, error, retry };
}
