// Loading room photos: EXIF lens data, downscaling and wall colour sampling.

const MAX_SIDE = 1600;
export const DEFAULT_FOCAL_35 = 26; // a typical phone main camera, in 35 mm-equivalent millimetres

// Read FocalLengthIn35mmFilm (EXIF tag 0xA405) from a JPEG. Returns null when absent.
export function readFocal35(buffer) {
  try {
    const v = new DataView(buffer);
    if (v.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off + 4 < v.byteLength) {
      const marker = v.getUint16(off);
      const len = v.getUint16(off + 2);
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10);
      if (marker === 0xffda || (marker & 0xff00) !== 0xff00) return null;
      off += 2 + len;
    }
  } catch { /* malformed EXIF */ }
  return null;
}

function parseTiff(v, start) {
  const le = v.getUint16(start) === 0x4949;
  const u16 = (o) => v.getUint16(start + o, le);
  const u32 = (o) => v.getUint32(start + o, le);
  const ifd0 = u32(4);
  let exif = null;
  for (let i = 0, n = u16(ifd0); i < n; i++) {
    const e = ifd0 + 2 + i * 12;
    if (u16(e) === 0x8769) exif = u32(e + 8);
  }
  if (exif == null) return null;
  for (let i = 0, n = u16(exif); i < n; i++) {
    const e = exif + 2 + i * 12;
    if (u16(e) === 0xa405) {
      const f = u16(e + 8);
      return f > 5 && f < 400 ? f : null;
    }
  }
  return null;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be opened as an image. Try a JPEG or PNG photo.'));
    img.src = url;
  });
}

function toBlobUrl(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(URL.createObjectURL(b)), 'image/jpeg', 0.9));
}

// Returns { canvas, url, width, height, focal35, focalSource }.
export async function loadPhotoFile(file) {
  const buffer = await file.arrayBuffer();
  const focal35 = readFocal35(buffer);
  const srcUrl = URL.createObjectURL(new Blob([buffer], { type: file.type || 'image/jpeg' }));
  try {
    const img = await loadImage(srcUrl);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      canvas,
      url: await toBlobUrl(canvas),
      width: canvas.width,
      height: canvas.height,
      focal35: focal35 ?? DEFAULT_FOCAL_35,
      focalSource: focal35 ? 'exif' : 'default',
      isSample: false,
    };
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}

export async function photoFromCanvas(canvas, extra) {
  return { canvas, url: await toBlobUrl(canvas), width: canvas.width, height: canvas.height, ...extra };
}

// Typical wall colour inside the back-wall rectangle, ignoring the darkest and brightest pixels
// (furniture, windows, lamps). Returns sRGB components in 0..1.
export function sampleWallColor(canvas, rect) {
  const x0 = Math.max(0, Math.round(rect.l + (rect.r - rect.l) * 0.1));
  const x1 = Math.min(canvas.width, Math.round(rect.r - (rect.r - rect.l) * 0.1));
  const y0 = Math.max(0, Math.round(rect.t + (rect.b - rect.t) * 0.08));
  const y1 = Math.min(canvas.height, Math.round(rect.b - (rect.b - rect.t) * 0.35));
  if (x1 - x0 < 4 || y1 - y0 < 4) return [0.9, 0.9, 0.88];
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(x0, y0, x1 - x0, y1 - y0).data;
  const px = [];
  const step = Math.max(1, Math.floor(Math.sqrt(data.length / 4 / 4000))) * 4;
  for (let i = 0; i < data.length; i += step) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    px.push([r, g, b, 0.2126 * r + 0.7152 * g + 0.0722 * b]);
  }
  px.sort((a, b) => a[3] - b[3]);
  const lo = Math.floor(px.length * 0.35), hi = Math.floor(px.length * 0.85);
  const acc = [0, 0, 0];
  for (let i = lo; i < hi; i++) { acc[0] += px[i][0]; acc[1] += px[i][1]; acc[2] += px[i][2]; }
  const n = Math.max(1, hi - lo);
  return acc.map((c) => c / n / 255);
}
