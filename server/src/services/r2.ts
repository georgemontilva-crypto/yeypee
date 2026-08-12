import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { cfg } from "../config";

function getClient(): S3Client | null {
  if (!cfg.r2.enabled) return null;
  return new S3Client({
    region: "auto",
    endpoint: cfg.r2.endpoint,
    credentials: {
      accessKeyId: cfg.r2.accessKeyId,
      secretAccessKey: cfg.r2.secretAccessKey,
    },
  });
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getClient();
  if (!client) {
    throw new Error("R2 is not configured (missing R2 credentials/endpoint)");
  }
  const cmd = new PutObjectCommand({
    Bucket: cfg.r2.bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 300 });
  const publicUrl = cfg.r2.publicUrl ? `${cfg.r2.publicUrl}/${key}` : "";
  return { uploadUrl, publicUrl };
}

export async function deleteObject(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: cfg.r2.bucket, Key: key })
    );
    return true;
  } catch (err) {
    console.error("R2 delete error:", err);
    return false;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.send(new HeadObjectCommand({ Bucket: cfg.r2.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function r2Diagnostics(): Promise<{
  configured: boolean;
  bucket: string;
  endpointHost: string;
  publicUrl: string;
  missing: string[];
  reachable: boolean;
  error?: string;
}> {
  const missing: string[] = [];
  if (!cfg.r2.accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!cfg.r2.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!cfg.r2.endpoint) missing.push("R2_ENDPOINT");
  if (!cfg.r2.bucket) missing.push("R2_BUCKET");
  if (!cfg.r2.publicUrl) missing.push("R2_PUBLIC_URL");

  let endpointHost = "";
  try {
    endpointHost = cfg.r2.endpoint ? new URL(cfg.r2.endpoint).host : "";
  } catch {
    endpointHost = "(R2_ENDPOINT is not a valid URL)";
  }

  const base = {
    configured: cfg.r2.enabled,
    bucket: cfg.r2.bucket,
    endpointHost,
    publicUrl: cfg.r2.publicUrl,
    missing,
  };

  const client = getClient();
  if (!client) return { ...base, reachable: false, error: "R2 credentials are incomplete." };

  // Listing zero keys is the cheapest call that proves creds + bucket are valid.
  try {
    await client.send(new ListObjectsV2Command({ Bucket: cfg.r2.bucket, MaxKeys: 1 }));
    return { ...base, reachable: true };
  } catch (err: any) {
    const name = err?.name || err?.Code || "";
    let message = err?.message || String(err);
    if (name === "NoSuchBucket") {
      message = `The bucket "${cfg.r2.bucket}" does not exist at this endpoint. Check R2_BUCKET.`;
    } else if (name === "InvalidAccessKeyId" || name === "SignatureDoesNotMatch") {
      message = "The access key or secret is wrong. Re-copy them from Cloudflare.";
    } else if (name === "AccessDenied") {
      message = `The token has no access to the bucket "${cfg.r2.bucket}". Check which bucket the token was issued for.`;
    }
    return { ...base, reachable: false, error: `${name ? name + ": " : ""}${message}` };
  }
}

/**
 * Uploads bytes to R2 from the server. Used by the admin upload endpoint so the
 * browser never talks to R2 directly — that avoids depending on the bucket's
 * CORS configuration entirely.
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ key: string; publicUrl: string }> {
  const client = getClient();
  if (!client) {
    throw new Error("R2 is not configured (missing R2 credentials/endpoint)");
  }
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const publicUrl = cfg.r2.publicUrl ? `${cfg.r2.publicUrl}/${key}` : "";
  return { key, publicUrl };
}

export function placeholderUrl(type: "image" | "video", folder?: string): string {
  // Local placeholder fallback when no media asset is assigned
  return type === "video" ? "/video/placeholder.mp4" : `/images/${folder ?? "other"}/placeholder.png`;
}
