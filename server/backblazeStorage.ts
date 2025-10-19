// Backblaze B2 storage integration using AWS SDK v3
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const keyId = process.env.BACKBLAZE_KEY_ID;
  const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
  const region = process.env.BACKBLAZE_BUCKET_REGION || 'us-west-002';

  if (!keyId || !applicationKey) {
    throw new Error('Backblaze B2 credentials not configured. Set BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY environment variables.');
  }

  // Construct the endpoint URL based on region
  const endpoint = `https://s3.${region}.backblazeb2.com`;

  s3Client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
  });

  return s3Client;
}

function getBucketName(): string {
  const bucketName = process.env.BACKBLAZE_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('BACKBLAZE_BUCKET_NAME environment variable not set');
  }
  return bucketName;
}

/**
 * Upload a file to Backblaze B2
 * @param key - The file path/key in the bucket (e.g., "artwork/episode-1.jpg")
 * @param data - The file data as Buffer, Uint8Array, or string
 * @param contentType - MIME type of the file
 * @returns Object with key and public URL
 */
export async function backblazeStoragePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucketName = getBucketName();
  const region = process.env.BACKBLAZE_BUCKET_REGION || 'us-west-002';

  // Normalize key (remove leading slashes)
  const normalizedKey = key.replace(/^\/+/, '');

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: normalizedKey,
    Body: typeof data === 'string' ? Buffer.from(data) : data,
    ContentType: contentType,
    // Make the file publicly readable
    ACL: 'public-read',
  });

  await client.send(command);

  // Construct the public URL
  const url = `https://s3.${region}.backblazeb2.com/${bucketName}/${normalizedKey}`;

  return { key: normalizedKey, url };
}

/**
 * Get a signed URL for a file in Backblaze B2
 * @param key - The file path/key in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 300 = 5 minutes)
 * @returns Object with key and signed URL
 */
export async function backblazeStorageGet(
  key: string,
  expiresIn = 300
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucketName = getBucketName();

  // Normalize key
  const normalizedKey = key.replace(/^\/+/, '');

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: normalizedKey,
  });

  const url = await getSignedUrl(client, command, { expiresIn });

  return { key: normalizedKey, url };
}

/**
 * Get the public URL for a file (assumes file is public-read)
 * @param key - The file path/key in the bucket
 * @returns Public URL
 */
export function backblazePublicUrl(key: string): string {
  const bucketName = getBucketName();
  const region = process.env.BACKBLAZE_BUCKET_REGION || 'us-west-002';
  const normalizedKey = key.replace(/^\/+/, '');
  
  return `https://s3.${region}.backblazeb2.com/${bucketName}/${normalizedKey}`;
}

