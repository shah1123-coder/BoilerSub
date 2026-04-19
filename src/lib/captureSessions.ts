import { randomUUID } from "node:crypto";
import { supabaseServiceClient } from "../config/supabase";

export type CaptureSessionRecord = {
  token: string;
  images: string[];
  createdAt: number;
  updatedAt: number;
};

export const CAPTURE_SESSION_TTL_MS = 1000 * 60 * 30;
export const MAX_CAPTURE_IMAGES = 10;
export const JPEG_DATA_URL_REGEX = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

const CAPTURE_BUCKET = "capture-sessions";

let ensureBucketPromise: Promise<void> | null = null;

function sessionPath(sessionId: string) {
  return `${sessionId}.json`;
}

function isNotFoundError(error: { message?: string; statusCode?: string } | null) {
  if (!error) {
    return false;
  }
  return error.statusCode === "404" || error.message?.toLowerCase().includes("not found") === true;
}

async function ensureBucket() {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const { data: buckets, error: listError } = await supabaseServiceClient.storage.listBuckets();
      if (listError) {
        throw new Error(listError.message);
      }

      if (buckets.some((bucket) => bucket.name === CAPTURE_BUCKET)) {
        return;
      }

      const { error: createError } = await supabaseServiceClient.storage.createBucket(CAPTURE_BUCKET, {
        public: false,
        fileSizeLimit: "50MB",
      });

      if (createError && !createError.message.toLowerCase().includes("already exists")) {
        throw new Error(createError.message);
      }
    })().catch((error) => {
      ensureBucketPromise = null;
      throw error;
    });
  }

  await ensureBucketPromise;
}

export function isCaptureSessionExpired(session: CaptureSessionRecord, now = Date.now()) {
  return now - session.updatedAt > CAPTURE_SESSION_TTL_MS;
}

export function createCaptureSessionRecord(): { sessionId: string; session: CaptureSessionRecord } {
  const now = Date.now();
  return {
    sessionId: randomUUID(),
    session: {
      token: randomUUID(),
      images: [],
      createdAt: now,
      updatedAt: now,
    },
  };
}

export async function saveCaptureSession(sessionId: string, session: CaptureSessionRecord) {
  await ensureBucket();

  const payload = new Blob([JSON.stringify(session)], { type: "application/json" });
  const { error } = await supabaseServiceClient.storage.from(CAPTURE_BUCKET).upload(sessionPath(sessionId), payload, {
    upsert: true,
    contentType: "application/json",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCaptureSession(sessionId: string): Promise<CaptureSessionRecord | null> {
  await ensureBucket();

  const { data, error } = await supabaseServiceClient.storage.from(CAPTURE_BUCKET).download(sessionPath(sessionId));
  if (isNotFoundError(error)) {
    return null;
  }
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const text = await data.text();
  const parsed = JSON.parse(text) as CaptureSessionRecord;
  if (isCaptureSessionExpired(parsed)) {
    await deleteCaptureSession(sessionId);
    return null;
  }

  return parsed;
}

export async function deleteCaptureSession(sessionId: string) {
  await ensureBucket();

  const { error } = await supabaseServiceClient.storage.from(CAPTURE_BUCKET).remove([sessionPath(sessionId)]);
  if (error && !isNotFoundError(error)) {
    throw new Error(error.message);
  }
}
