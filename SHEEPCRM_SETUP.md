# SheepCRM Integration Setup Guide

This guide covers automatic certificate generation from SheepCRM paid events.

## Overview

The app now supports:

1. Automatic Sheep webhook processing for paid events.
2. Duplicate-delivery protection so the same webhook is not processed twice.
3. A capture-only mode for safely logging the first live payload.
4. Template selection for these membership types:
   - First Aid Training Provider
   - Mental Health Training Provider
   - In Safe Hands Award

The current certificate renderer still relies on the existing PowerPoint-to-PDF conversion path. Template selection is now ready for additional membership templates as soon as those files are added to the `templates` folder.

## Step 1: Get Your SheepCRM Credentials

### API Key
1. Log into SheepCRM.
2. Open Settings and then API or Integrations.
3. Generate a new API key.
4. Copy the key and store it securely.

### Bucket Name
Your bucket is the organisation identifier used in SheepCRM URLs, for example:

- `https://app.sheepcrm.com/YOUR-BUCKET/...`

## Step 2: Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
APP_BASE_URL=https://your-app.vercel.app

NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=licences

SHEEPCRM_API_KEY=
SHEEPCRM_BUCKET=
SHEEPCRM_BASE_URL=https://sls-api.sheepcrm.com
SHEEPCRM_WEBHOOK_SECRET=
SHEEPCRM_PAYMENT_EVENT_NAMES=payment.paid,payment_paid,payment.succeeded
SHEEPCRM_WEBHOOK_CAPTURE_ONLY=true
SHEEPCRM_ALLOW_UNSIGNED_WEBHOOKS=true
```

### Important Variables

- `APP_BASE_URL`
  - Required so the webhook route can call the internal certificate-generation route consistently in production.
- `SHEEPCRM_PAYMENT_EVENT_NAMES`
  - Comma-separated exact event names that should count as successful paid events.
  - Start broad, then tighten this after capturing the first real payload.
- `SHEEPCRM_WEBHOOK_CAPTURE_ONLY`
  - Use `true` for the first live webhook test.
  - Change to `false` once the payload shape and event names are confirmed.
- `SHEEPCRM_ALLOW_UNSIGNED_WEBHOOKS`
  - Set this to `true` for Sheep outgoing actions unless Sheep is explicitly configured to send a signature header.
  - This lets the app accept Sheep's unsigned webhook POSTs during setup and production use.

## Step 3: Deploy the App

Deploy the Next.js app and confirm the production URL that SheepCRM should call.

## Step 4: Configure the SheepCRM Webhook

Create a webhook in SheepCRM with:

- URL: `https://your-app.vercel.app/api/webhooks/sheepcrm`
- Secret: the same value as `SHEEPCRM_WEBHOOK_SECRET`
- Events: the paid/payment-success events available in SheepCRM

## Step 5: Capture the First Real Payload Safely

Before live automation, keep:

```env
SHEEPCRM_WEBHOOK_CAPTURE_ONLY=true
```

Then:

1. Trigger a real or test payment in SheepCRM.
2. Open your deployment logs.
3. Find the `SHEEPCRM PAYMENT WEBHOOK RECEIVED` entry.
4. Record:
   - the exact `event` value,
   - any payment status fields,
   - whether the payload contains `member_uri`, `person_uri`, `contact_uri`, or another identifier.
5. Update `SHEEPCRM_PAYMENT_EVENT_NAMES` to the exact paid event names only.

If Sheep uses different field names than the current handler expects, update the webhook extraction logic before switching live generation on.

## Step 6: Enable Automatic Generation

Set:

```env
SHEEPCRM_WEBHOOK_CAPTURE_ONLY=false
```

Then trigger another paid event. The app should:

1. verify the signature,
2. classify the event,
3. resolve the correct member or fallback contact URI,
4. fetch certificate data,
5. render the certificate,
6. upload it to Supabase,
7. write a dedupe marker so retries do not generate duplicates.

## Step 7: Verify Output

After a successful webhook:

1. Confirm logs show `Certificate generated successfully`.
2. Check Supabase Storage for a PDF under:

```text
licences/<year>/<membership-type-key>/...
```

3. Check Supabase Storage for a dedupe marker under:

```text
webhook-processing/sheepcrm/...
```

4. Retry the same webhook and confirm the response is treated as already processed.

## Manual Testing

The manual sync page still works for known Sheep member URIs.

Use a member URI in the form:

```text
/bucket/member/uid/
```

## Membership Template Files

The app now resolves templates by membership type using these filenames:

- `templates/licence_template.pptx`
- `templates/mental_health_training_provider_template.pptx`
- `templates/in_safe_hands_award_template.pptx`

If the new templates are not present yet, First Aid Training Provider will continue working with the existing file, while the new membership types will return a missing-template error until their template files are added.

## Troubleshooting

### Invalid webhook signature
- Make sure the SheepCRM webhook secret exactly matches `SHEEPCRM_WEBHOOK_SECRET`.

### Webhook is received but ignored
- Check the event name in logs.
- Confirm it appears in `SHEEPCRM_PAYMENT_EVENT_NAMES`.
- Check whether the payload status indicates a pending, failed, refunded, or cancelled state.

### No certificate generated during first test
- Confirm `SHEEPCRM_WEBHOOK_CAPTURE_ONLY` is not still set to `true`.

### No member URI in the payload
- The webhook handler can fall back to person/contact URIs.
- If Sheep sends different field names, update the extraction logic after reviewing the captured payload.

### Duplicate retries
- Duplicate deliveries are expected from many webhook systems.
- The app uses a dedupe marker in Supabase Storage and will skip repeated processing for the same event key.

### Missing template for Mental Health or In Safe Hands
- Add the corresponding `.pptx` template file to `templates/`.
- Keep the file names aligned with the list above, or update the template mapping in the app.
