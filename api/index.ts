import { randomUUID } from "node:crypto";
import client from "prom-client";
import { serve } from "@hono/node-server";
import { quickAddJob } from "graphile-worker";
import fs from "fs";
import { Hono } from "hono";
import {
  uploadToSupabaseStorage,
  resumableUploadToSupabase,
} from "../lib/upload";
import * as yup from "yup";
import { contactsArraySchema } from "./validation";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const app = new Hono();
const connectionString = process.env.DATABASE_URL!;

app.post("/import", async (c) => {
  const body = await c.req.json();
  const { source, data } = body;
  if (typeof source !== "string" || !Array.isArray(data)) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  try {
    await contactsArraySchema.validate(data, { abortEarly: false });
  } catch (validationError) {
    if (validationError instanceof yup.ValidationError) {
      return c.json({ error: "Invalid contacts data", details: validationError.errors }, 400);
    }
    return c.json({ error: "Invalid contacts data", details: [String(validationError)] }, 400);
  }

  const jobId = `import-${randomUUID()}`;
  const filePath = `imports/${jobId}.json`;
  const tmpFilePath = `/tmp/${jobId}.json`;
  const projectId = process.env.SUPABASE_PROJECT_ID!;
  const bucketName = "imports";
  fs.writeFileSync(tmpFilePath, JSON.stringify(data));
  const fileSize = fs.statSync(tmpFilePath).size;
  const SIZE_THRESHOLD = 50 * 1024 * 1024;
  let uploadError = null;

  if (fileSize > SIZE_THRESHOLD) {
    try {
      await resumableUploadToSupabase(
        bucketName,
        filePath,
        tmpFilePath,
        projectId,
        "application/json"
      );
    } catch (err) {
      uploadError = err;
    }
  } else {
    const { error } = await uploadToSupabaseStorage(
      bucketName,
      filePath,
      fs.readFileSync(tmpFilePath),
      "application/json"
    );
    uploadError = error;
  }

  fs.unlinkSync(tmpFilePath);

  if (uploadError) {
    return c.json({ error: "Failed to upload data" }, 500);
  }

  await quickAddJob({ connectionString }, "import", { jobId, source });

  return c.json({ jobId });
});

app.get("/metrics", async (c) => {
  return c.text(await client.register.metrics());
});

app.get("/health", async (c) => {
  return c.text("OK", 200);
});

const port = parseInt(process.env.PORT || "3000");

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
