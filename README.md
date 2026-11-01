# ResumePro

Next.js resume audits with an optional private review inbox. The public audit runs in the browser. Only users who select private expert review send their file and extracted details to the server.

## Local development

Use Node.js 22.13+ and run `npm ci`, then `npm run dev`. `npm test` runs format/scoring checks and a disposable MongoDB integration test. The test MongoDB binary is downloaded on its first run. `npm run build` prepares the local PDF worker and builds production assets.

## Free hosting: Netlify

[Deploy from this repository](https://app.netlify.com/start/deploy?repository=https://github.com/Himanshujoshi007/ATS-Tool).

Select the Free plan, connect the repository, use `npm run build` and `.next` as the publish directory. The included `netlify.toml` configures Node 22. Netlify automatically provides its Next.js adapter. No local files or credentials should be uploaded manually.

Netlify serves static assets without Render-style idle sleeping. Server functions can have cold starts. Free plans have a credit/usage cap and no uptime guarantee; monitor the dashboard. File uploads are limited to 3 MB to leave room for multipart and function-payload overhead.

## Separate MongoDB Atlas Free project

1. In your Atlas account create a new project named `ResumePro`, then a **Free / M0** cluster. Do not enable a paid upgrade.
2. Create an application database user restricted to `readWrite` on the `resumepro` database. Keep its password in a password manager.
3. Configure Atlas network access for your hosting environment. Use specific egress ranges where available. Standard Netlify Functions do not provide a dedicated static outbound IP; do not silently broaden an existing access list. Decide on the network allowance before connecting production.
4. Set the following **server-only** Netlify environment variables and redeploy:
   - `MONGODB_URI`: the Atlas connection string with URL-encoded database-user credentials.
   - `MONGODB_DB`: `resumepro`.
   - `ADMIN_TOKEN`: at least 32 random characters. Generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
   - `APP_ORIGIN`: the exact public HTTPS site origin, with no trailing slash.
5. Copy the same values into your ignored `.env.local` only if you need local storage. Use `http://localhost:3100` for local `APP_ORIGIN` on port 3100.

Never add `NEXT_PUBLIC_` to credentials. Never commit `.env.local`, downloaded resumes, exports, or access keys. Storage remains disabled until the MongoDB URI and owner key are set. An invalid URI causes an explicit failed-save notice, never a false success.

## What is saved

The original PDF/DOCX/TXT bytes, extracted text, name, email, phone, LinkedIn, education, calculated audit score, upload date and consent version are stored atomically in one MongoDB document. These files are below MongoDB's document limit. Extraction is heuristic and labeled unverified; the owner should review it. Resume metadata does not determine candidate eligibility or hiring outcomes.

Records expire after 90 days. A database TTL index removes both file and metadata together; API reads also exclude expired records immediately. MongoDB cleanup can lag expiry. Exports/downloads are separate owner-controlled copies. Monitor the 512 MB free storage allocation: a large collection of resume files can fill it.

## Private owner inbox

Open `/admin`, enter the owner access key, and view the latest 1,000 unexpired records. Download originals or export CSV for Excel/Google Sheets. The key stays in page memory and is sent only as an authorization header. API routes have no public read access and use no-store responses. Lock or close the page when finished. CSV cells are escaped against spreadsheet formula injection.

No automatic email, Google Drive, or Google Sheets delivery is enabled. The private database plus owner export is the supported collection system.

## Reliability and abuse controls

The UI retries temporary save failures up to three times, reusing a random submission ID so retried saves do not duplicate records. A failed save remains visible with a manual retry; it is not queued once the page closes. Collection requires explicit consent, same-origin requests, valid file signatures and bounded payload size. Database counters limit saves to 10 per connecting IP per hour and 100 globally per day. The trusted connecting-IP header from the detected Vercel or Netlify platform is hashed before rate limiting. Other platforms need their own trusted IP configuration. Operators should add bot protection before high-volume promotion.

No free service can promise failure-free operation. Track hosting credits, database capacity and connection health; keep recoverable backups according to your privacy and retention needs.

## Analysis motion and diagnostics

The analysis view displays validated pipeline progress, per-page PDF parsing, lexical token counts and elapsed time. Brief transitions keep each completed stage readable; the percentage is stage completion, not a time prediction. A CSS 3D scanner, score count-up and card motion respect reduced-motion preferences.

The calculation trace shows category contributions, type-token ratio, action density, quantified-evidence density and contextual skill coverage with their actual numerators and denominators. These diagnostics add no hidden score bonus.
