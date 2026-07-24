// Everything in this file is plain, dependency-free JavaScript/TypeScript
// operating on Canvas ImageData. No WASM, no external library, no CDN
// script — nothing that can fail to load or hang. This runs inside
// scanner-worker.worker.ts, off the main thread, so even a few hundred
// milliseconds of pixel-crunching never affects page responsiveness.

export interface Point {
  x: number;
  y: number;
}

export type FilterMode = "original" | "enhanced" | "grayscale" | "bw";

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function clampIndex(v: number, max: number): number {
  return v < 0 ? 0 : v >= max ? max - 1 : v;
}

// ---------------------------------------------------------------------------
// Perspective transform (hand-rolled homography solve — the same math
// OpenCV's getPerspectiveTransform does internally, solved via Gaussian
// elimination on the 8x8 linear system for the 8 free coefficients).
// ---------------------------------------------------------------------------

function gaussianSolve(A: number[][], B: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, B[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    }
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    const pivotVal = M[col][col];
    if (Math.abs(pivotVal) < 1e-10) continue;
    for (let c = col; c <= n; c++) M[col][c] /= pivotVal;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/** Solves for coefficients [a,b,c,d,e,f,g,h] such that, for every (src,dst)
 * pair: dst.x = (a*src.x + b*src.y + c) / (g*src.x + h*src.y + 1), and
 * similarly for dst.y with d,e,f. */
function solvePerspectiveCoeffs(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    B.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    B.push(dy);
  }
  return gaussianSolve(A, B);
}

function applyCoeffs(coeffs: number[], x: number, y: number): Point {
  const [a, b, c, d, e, f, g, h] = coeffs;
  const denom = g * x + h * y + 1;
  return { x: (a * x + b * y + c) / denom, y: (d * x + e * y + f) / denom };
}

function orderPoints(pts: Point[]): Point[] {
  const sums = pts.map((p) => p.x + p.y);
  const diffs = pts.map((p) => p.x - p.y);
  const tl = pts[sums.indexOf(Math.min(...sums))];
  const br = pts[sums.indexOf(Math.max(...sums))];
  const tr = pts[diffs.indexOf(Math.max(...diffs))];
  const bl = pts[diffs.indexOf(Math.min(...diffs))];
  return [tl, tr, br, bl];
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Perspective-warps the quadrilateral `corners` (any order) in `src` into a
 * flat rectangle, using inverse mapping + bilinear sampling for quality. */
function warpPerspective(src: ImageData, corners: Point[]): ImageData {
  const [tl, tr, br, bl] = orderPoints(corners);
  const widthTop = dist(tl, tr);
  const widthBottom = dist(bl, br);
  const heightLeft = dist(tl, bl);
  const heightRight = dist(tr, br);

  const outWidth = Math.max(Math.round(Math.max(widthTop, widthBottom)), 1);
  const outHeight = Math.max(Math.round(Math.max(heightLeft, heightRight)), 1);

  const dstRect: Point[] = [
    { x: 0, y: 0 },
    { x: outWidth, y: 0 },
    { x: outWidth, y: outHeight },
    { x: 0, y: outHeight },
  ];

  // Solve dst-rect -> src-corners directly, so we get the inverse mapping
  // (needed for pixel sampling) without a separate matrix inversion step.
  const coeffs = solvePerspectiveCoeffs(dstRect, [tl, tr, br, bl]);

  const out = new ImageData(outWidth, outHeight);
  const sw = src.width;
  const sh = src.height;
  const sdata = src.data;
  const odata = out.data;

  for (let dy = 0; dy < outHeight; dy++) {
    for (let dx = 0; dx < outWidth; dx++) {
      const { x: sx, y: sy } = applyCoeffs(coeffs, dx, dy);
      const oi = (dy * outWidth + dx) * 4;

      if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
        odata[oi] = 255;
        odata[oi + 1] = 255;
        odata[oi + 2] = 255;
        odata[oi + 3] = 255;
        continue;
      }

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x0 + 1) * 4;
      const i01 = ((y0 + 1) * sw + x0) * 4;
      const i11 = ((y0 + 1) * sw + x0 + 1) * 4;

      for (let ch = 0; ch < 4; ch++) {
        const top = sdata[i00 + ch] * (1 - fx) + sdata[i10 + ch] * fx;
        const bot = sdata[i01 + ch] * (1 - fx) + sdata[i11 + ch] * fx;
        odata[oi + ch] = top * (1 - fy) + bot * fy;
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Rotation
// ---------------------------------------------------------------------------

function rotateImageData(imgData: ImageData, rotation: 0 | 90 | 180 | 270): ImageData {
  if (rotation === 0) return imgData;

  const { width: w, height: h } = imgData;
  const outW = rotation === 180 ? w : h;
  const outH = rotation === 180 ? h : w;

  const srcCanvas = new OffscreenCanvas(w, h);
  srcCanvas.getContext("2d")!.putImageData(imgData, 0, 0);

  const outCanvas = new OffscreenCanvas(outW, outH);
  const ctx = outCanvas.getContext("2d")!;
  ctx.save();
  if (rotation === 90) {
    ctx.translate(outW, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    ctx.translate(outW, outH);
    ctx.rotate(Math.PI);
  } else {
    ctx.translate(0, outH);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.restore();

  return ctx.getImageData(0, 0, outW, outH);
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function applyBrightnessContrastInPlace(data: Uint8ClampedArray, brightness: number, contrast: number) {
  const alpha = 1 + contrast / 100;
  const beta = brightness;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp((data[i] - 128) * alpha + 128 + beta);
    data[i + 1] = clamp((data[i + 1] - 128) * alpha + 128 + beta);
    data[i + 2] = clamp((data[i + 2] - 128) * alpha + 128 + beta);
  }
}

function toGrayscaleInPlace(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function boostSaturationInPlace(data: Uint8ClampedArray, factor: number) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h /= 6;
    }

    const boostedS = Math.min(1, s * factor);
    const [nr, ng, nb] = hslToRgb(h, boostedS, l);
    data[i] = clamp(nr * 255);
    data[i + 1] = clamp(ng * 255);
    data[i + 2] = clamp(nb * 255);
  }
}

/** Separable box blur on a single-channel Float32 buffer — O(n), used both
 * for light noise reduction and as the local-mean baseline for adaptive
 * thresholding in the B&W scanner filter. */
function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  const size = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += src[y * width + clampIndex(x, width)];
    for (let x = 0; x < width; x++) {
      tmp[y * width + x] = sum / size;
      const xOut = clampIndex(x - radius, width);
      const xIn = clampIndex(x + radius + 1, width);
      sum += src[y * width + xIn] - src[y * width + xOut];
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += tmp[clampIndex(y, height) * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / size;
      const yOut = clampIndex(y - radius, height);
      const yIn = clampIndex(y + radius + 1, height);
      sum += tmp[yIn * width + x] - tmp[yOut * width + x];
    }
  }

  return out;
}

function applyBlackAndWhiteScannerInPlace(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  brightness: number,
  contrast: number
) {
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const alpha = 1 + contrast / 100;
  const beta = brightness;
  for (let p = 0; p < gray.length; p++) gray[p] = clamp((gray[p] - 128) * alpha + 128 + beta);

  // Light noise reduction (small blur) before computing the adaptive
  // threshold baseline (larger blur = local average brightness).
  const denoised = boxBlur(gray, width, height, 1);
  const localMean = boxBlur(denoised, width, height, 15);

  const C = 10; // bias, mirrors a typical adaptive-threshold constant
  for (let p = 0; p < denoised.length; p++) {
    const v = denoised[p] < localMean[p] - C ? 0 : 255;
    const i = p * 4;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

// ---------------------------------------------------------------------------
// Public pipeline
// ---------------------------------------------------------------------------

export interface ProcessOptions {
  corners: Point[] | null;
  rotation: 0 | 90 | 180 | 270;
  filterMode: FilterMode;
  brightness: number;
  contrast: number;
}

function imageDataFromBitmap(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function imageDataToBlob(imgData: ImageData, quality: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(imgData.width, imgData.height);
  canvas.getContext("2d")!.putImageData(imgData, 0, 0);
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

export async function processBitmap(
  bitmap: ImageBitmap,
  options: ProcessOptions,
  quality?: number
): Promise<{ blob: Blob; width: number; height: number }> {
  let imgData = imageDataFromBitmap(bitmap);

  if (options.corners) imgData = warpPerspective(imgData, options.corners);
  imgData = rotateImageData(imgData, options.rotation);

  const data = imgData.data;
  switch (options.filterMode) {
    case "enhanced":
      boostSaturationInPlace(data, 1.25);
      applyBrightnessContrastInPlace(data, options.brightness, options.contrast);
      break;
    case "grayscale":
      toGrayscaleInPlace(data);
      applyBrightnessContrastInPlace(data, options.brightness, options.contrast);
      break;
    case "bw":
      applyBlackAndWhiteScannerInPlace(data, imgData.width, imgData.height, options.brightness, options.contrast);
      break;
    default:
      applyBrightnessContrastInPlace(data, options.brightness, options.contrast);
  }

  const q = quality || (options.filterMode === "bw" ? 0.9 : 0.85);
  const blob = await imageDataToBlob(imgData, q);
  return { blob, width: imgData.width, height: imgData.height };
}

export async function commitCropBitmap(
  bitmap: ImageBitmap,
  corners: Point[],
  rotation: 0 | 90 | 180 | 270
): Promise<{ blob: Blob; width: number; height: number }> {
  let imgData = imageDataFromBitmap(bitmap);
  imgData = warpPerspective(imgData, corners);
  imgData = rotateImageData(imgData, rotation);
  const blob = await imageDataToBlob(imgData, 0.95);
  return { blob, width: imgData.width, height: imgData.height };
}
