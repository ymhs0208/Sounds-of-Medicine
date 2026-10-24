const MAX_IMAGE_CHARS = 1_500_000;
const MAX_DECODED_BYTES = 1_100_000;

export type ImageCheck = { ok: true; mime: "image/jpeg" | "image/png" | "image/webp" } | { ok: false };

function bytesOf(base64: string, count: number): Uint8Array | null {
  try {
    const slice = base64.slice(0, Math.ceil(count / 3) * 4);
    const binary = atob(slice);
    const bytes = new Uint8Array(Math.min(count, binary.length));
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function matches(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

export function checkImageBytes(bytes: Uint8Array, mime: string): boolean {
  if (bytes.byteLength < 12 || bytes.byteLength > MAX_DECODED_BYTES) return false;
  return matches(bytes, mime);
}

/** Accept only a real JPEG, PNG, or WebP data URL under the size cap. */
export function checkImageDataUrl(value: string): ImageCheck {
  if (value.length > MAX_IMAGE_CHARS) return { ok: false };
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
  if (!match) return { ok: false };
  const mime = match[1] as "image/jpeg" | "image/png" | "image/webp";
  const payload = match[2].replace(/\s/g, "");
  const decodedLength = Math.floor((payload.length * 3) / 4);
  if (decodedLength > MAX_DECODED_BYTES) return { ok: false };
  const bytes = bytesOf(payload, 12);
  if (!bytes || !matches(bytes, mime)) return { ok: false };
  return { ok: true, mime };
}
