# SheepCRM Integration Setup Guide

This guide will help you set up the automatic certificate generation integration with SheepCRM.

## Overview

The integration allows your app to automatically generate training provider certificates when payments are received in SheepCRM. When a payment webhook is received, the app:

1. Fetches member details from SheepCRM API
2. Extracts company name, address, membership number, and dates
3. Generates a certificate PDF
4. Stores it in Supabase for later access

## Step 1: Get Your SheepCRM API Credentials

### API Key
1. Log into your SheepCRM account
2. Go to Settings → API or Integrations
3. Generate a new API key
4. Copy the API key (you'll only see it once!)

### Bucket Name
Your bucket name is your organization/client identifier in SheepCRM. You can find it:
- In the URL when logged into SheepCRM: `https://app.sheepcrm.com/YOUR-BUCKET/...`
- In the API documentation examples
- By asking SheepCRM support

## Step 2: Configure Environment Variables

1. Copy your `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your SheepCRM credentials to `.env.local`:
   ```
   SHEEPCRM_API_KEY=your_api_key_here
   SHEEPCRM_BUCKET=your_bucket_name
   SHEEPCRM_BASE_URL=https://sls-api.sheepcrm.com
   SHEEPCRM_WEBHOOK_SECRET=create_a_random_secret_string
   ```

### Webhook Secret
Generate a strong random secret for webhook signature verification:
```bash
# On Linux/Mac:
openssl rand -hex 32

# Or use any random string generator
```

## Step 3: Deploy Your Application

1. Deploy your Next.js app to your hosting provider (Vercel, etc.)
2. Note your production URL (e.g., `https://your-app.vercel.app`)

## Step 4: Configure SheepCRM Webhook

1. Log into SheepCRM
2. Go to Settings → Webhooks or Integrations
3. Create a new webhook with:
   - **URL**: `https://your-app.vercel.app/api/webhooks/sheepcrm`
   - **Events**: Select "Payment Received" or relevant payment events
   - **Secret**: Use the same `SHEEPCRM_WEBHOOK_SECRET` from your `.env.local`

4. Save and test the webhook

## Step 5: Test the Integration

### Option 1: Manual Testing (Recommended First)
1. Navigate to the "SheepCRM Sync" page in your app
2. Find a member URI from SheepCRM:
   - Go to a member's profile in SheepCRM
   - The URI is in the format: `/your-bucket/person/abc123/`
3. Paste the URI and click "Generate Certificate from SheepCRM"
4. Verify the certificate is generated correctly

### Option 2: Webhook Testing
1. In SheepCRM, trigger a test webhook or make a test payment
2. Check your application logs for webhook receipt
3. Verify the certificate was auto-generated
4. Check Supabase storage for the PDF

## Data Mapping

The integration maps SheepCRM data to certificate fields as follows:

| Certificate Field | SheepCRM Source | API Endpoint |
|-------------------|----------------|--------------|
| Company Name | Contact/Organisation display name | `/api/v1/{bucket}/{resource}/{uid}/display` |
| Company Address | Organisation or Person record | `/api/v1{contact_uri}` (full record) |
| Licence Number | Membership number | From member record |
| Start Date | Membership start_date | From member record |
| End Date | Membership end_date | From member record |

**Important:** The integration uses **Member URIs** (format: `/bucket/member/uid/`) which contain all the necessary information including references to the training provider organisation and their membership details.

## Troubleshooting

### "SHEEPCRM_API_KEY environment variable is not set"
- Make sure you've created `.env.local` and added your API key
- Restart your development server after adding environment variables

### "Invalid webhook signature"
- Ensure the webhook secret in SheepCRM matches your `SHEEPCRM_WEBHOOK_SECRET`
- Check that the secret is properly configured on both sides

### "No active membership found for contact"
- Verify the member has an active membership in SheepCRM
- Check that the membership status is "active" or "Active"

### "No address found for contact"
- Ensure the member has an address in their SheepCRM contact record
- Check the communications/detail endpoint for the member

### Certificate not generating
1. Check application logs for errors
2. Test the manual sync first to isolate webhook issues
3. Verify all environment variables are set
4. Check SheepCRM webhook delivery logs

## API Endpoints

Your app now has these new endpoints:

- **POST /api/webhooks/sheepcrm** - Receives webhooks from SheepCRM (automatic)
- **GET /api/webhooks/sheepcrm** - Webhook health check
- **POST /api/sheepcrm/sync** - Manual sync trigger (for testing)

## Security Notes

- The webhook secret is used to verify webhook authenticity
- Always use HTTPS in production
- Keep your API key secure and never commit it to version control
- Rotate your API key periodically

## Support

If you encounter issues:
1. Check the application logs
2. Verify your SheepCRM API credentials
3. Test the manual sync endpoint first
4. Contact SheepCRM support for webhook-specific issues
