/// <reference lib="webworker" />

// This worker has zero external dependencies — no WASM, no CDN script, no
// npm image-processing library. Everything it does is plain Canvas 2D and
// typed-array pixel math (see canvas-processing.ts). That matters after a
// long fight with OpenCV.js hanging unrecoverably inside a Worker on some
// machines with no error and no way to debug it further remotely: this
// version has nothing that can fail to load, because there's nothing to
// load — it's ready the instant the script itself finishes parsing.

import { processBitmap, commitCropBitmap, type ProcessOptions, type Point } from "@/lib/scanner/canvas-processing";

function post(msg: unknown, transfer?: Transferable[]) {
  (self as unknown as Worker).postMessage(msg, transfer as any);
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    // Nothing to initialize — respond immediately.
    post({ type: "ready" });
    return;
  }

  const { id, type } = msg;
  try {
    if (type === "process") {
      const bitmap: ImageBitmap = msg.bitmap;
      const options: ProcessOptions = msg.options;
      const quality: number | undefined = msg.quality;
      const result = await processBitmap(bitmap, options, quality);
      post({ id, type: "result", blob: result.blob, width: result.width, height: result.height });
    } else if (type === "commitCrop") {
      const bitmap: ImageBitmap = msg.bitmap;
      const corners: Point[] = msg.corners;
      const rotation: 0 | 90 | 180 | 270 = msg.rotation;
      const result = await commitCropBitmap(bitmap, corners, rotation);
      post({ id, type: "result", blob: result.blob, width: result.width, height: result.height });
    }
  } catch (err) {
    post({ id, type: "error", error: err instanceof Error ? err.message : String(err) });
  }
};

export {};
