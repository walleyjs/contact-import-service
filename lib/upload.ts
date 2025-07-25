import { createClient } from "@supabase/supabase-js";
import { Upload } from "tus-js-client";
import fs from "fs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Standard upload to Supabase Storage (for small/medium files)
 * @param bucketName - The storage bucket name
 * @param filePath - The path in the bucket (e.g., imports/job-123.json)
 * @param content - The file content (Buffer, string, or Blob)
 * @param contentType - MIME type (e.g., 'application/json')
 */
export async function uploadToSupabaseStorage(
  bucketName: string,
  filePath: string,
  content: Buffer | string | Blob,
  contentType = "application/json"
) {
  return supabase.storage.from(bucketName).upload(filePath, content, {
    contentType,
    upsert: true,
  });
}

/**
 * Resumable upload to Supabase Storage (for large files)
 * @param bucketName - The storage bucket name
 * @param fileName - The object name in the bucket
 * @param filePath - Local file path to upload
 * @param projectId - Your Supabase project ref (e.g., abcd1234)
 * @param contentType - MIME type (e.g., 'application/json')
 * @returns Promise<void>
 */
export async function resumableUploadToSupabase(
  bucketName: string,
  fileName: string,
  filePath: string,
  projectId: string,
  contentType = "application/json"
): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const file = fs.createReadStream(filePath);
  const endpoint =
    process.env.NODE_ENV == "prod"
      ? `https://${projectId}.supabase.co/storage/v1/upload/resumable`
      :  "http://127.0.0.1:54321/storage/v1/upload/resumable" ;

  return new Promise((resolve, reject) => {
    const upload = new Upload(file as any, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName,
        objectName: fileName,
        contentType,
        cacheControl: 3600,
      },
      chunkSize: 6 * 1024 * 1024, 
      onError: function (error) {
        console.error("Resumable upload failed:", error);
        reject(error);
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(bytesUploaded, bytesTotal, percentage + "%");
      },
      onSuccess: function () {
        console.log("Resumable upload successful");
        resolve();
      },
    });

    upload.findPreviousUploads().then(function (previousUploads) {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}