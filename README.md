# Take-Home Exercise

## Task: Build an Import Pipeline Using Hono + Supabase + Graphile Worker

### Overview

Build a minimal backend system using **Hono** (for the API) and **Supabase** (for storage and database) that can:

1. Accept **large JSON data** via an API endpoint
2. Offload the data to **Supabase Storage**
3. Run a **worker** that downloads, parses, and imports the data into a `contacts` table

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start Supabase locally
pnpm run supabase:start

# 3. Install graphile-worker
pnpm run graphile-worker:install

# 4. Start the api-service in watch mode
pnpm run dev

# 5. Run the e2e script
pnpm run e2e
```

The E2E script will:
- Check Supabase is running
- Start the API service
- Make a sample import request
- Run the worker to process the job

Its here to help you see the e2e flow. Of course, yoou are free to run individual commands!

## Requirements

### 1. **API: `POST /import`**

**Stack:** [Hono](https://hono.dev/) (TypeScript)

**Behavior:**
- Accepts a JSON payload:
  ```json
  {
    "source": "crm-tool-x",
    "data": [ { "name": "Alice", "email": "alice@example.com" }, ... ]
  }
  ```
- Uploads the full `data` array to **Supabase Storage**, e.g. `imports/{jobId}.json`
- **IMPORTANT**: Must stream and process data without loading entire file into memory
- Queues a job using **Graphile Worker**
- Responds with:
  ```json
  { "jobId": "import-123" }
  ```

### 2. **Worker: Graphile Worker with runOnce**

**Stack:** Node.js + `@supabase/supabase-js` + `graphile-worker`

**Behavior:**
- Uses [Graphile Worker](https://github.com/graphile/worker)
- **IMPORTANT**: Must stream and process data without loading entire file into memory
- **Inserts contacts** into Supabase

### 3. **Database Schema: `contacts` Table**

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  source TEXT,
  imported_at TIMESTAMP DEFAULT now()
);
```

## What We're Looking For

- Clean TypeScript code
- **Memory-efficient streaming** - Never load entire datasets into memory
- Clear API and worker separation
- Use of Supabase (Storage + PostgREST)
- Good error handling

## What We're Not Looking For

- Authentication
- Progress reporting

## Bonus Features (Optional)

- Add Prometheus metrics to track the number of imported contacts
- Support CSV file upload instead of JSON
- Write unit tests for your implementation
- Add data validation for contacts

## Troubleshooting

- text us! We are here to help.

## Links
- [Graphile Worker](https://worker.graphile.org/)
- [Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Creating Buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets?queryGroups=language&language=sql)


Good luck! 🚀
