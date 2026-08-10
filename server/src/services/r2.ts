import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
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

export function placeholderUrl(type: "image" | "video", folder?: string): string {
  // Local placeholder fallback when no media asset is assigned
  return type === "video" ? "/video/placeholder.mp4" : `/images/${folder ?? "other"}/placeholder.png`;
}
