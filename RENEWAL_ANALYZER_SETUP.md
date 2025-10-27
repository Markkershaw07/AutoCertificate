# Renewal Form Analyzer Setup Guide

This guide explains how to set up the automated renewal form analysis feature.

## Overview

When a training provider submits a renewal form in SheepCRM, the system automatically:
1. Receives a webhook notification from SheepCRM
2. Fetches the form submission data
3. Analyzes the form with AI (Claude) to identify missing items and compliance issues
4. Calculates renewal pricing based on certificates issued and trainer count
5. Posts a detailed summary note to the organization's SheepCRM profile

## Prerequisites

- SheepCRM API access (existing)
- Anthropic API key for Claude AI
- Form Response ID from your renewal form in SheepCRM

## Setup Steps

### 1. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy the API key (you'll only see it once!)

### 2. Add Environment Variables

#### Local Development

Add to your `.env.local`:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

#### Production (Vercel)

```bash
vercel env add ANTHROPIC_API_KEY
# Select: Production
# Enter your Anthropic API key
```

### 3. Configure SheepCRM Webhook

1. Log into SheepCRM
2. Go to Settings → Webhooks or Integrations
3. Create a new webhook with:
   - **URL**: `https://your-app.vercel.app/api/webhooks/form-submission`
   - **Events**: Form submission events (status changes to "submitted")
   - **Form Filter**: Select your "First Aid Training Provider Renewal Form"
   - **Secret**: Use the same `SHEEPCRM_WEBHOOK_SECRET` from your environment variables

### 4. Test the Integration

#### Option 1: Test with Real Form Submission
1. Submit a test renewal form in SheepCRM
2. Check Vercel logs for webhook processing
3. Verify journal note appears on organization profile

#### Option 2: Manual Test Script
```bash
node scripts/test-renewal-analysis.js
```

## How It Works

### Webhook Endpoint
- **URL**: `/api/webhooks/form-submission`
- **Method**: POST
- **Signature Verification**: Uses HMAC SHA256 with `SHEEPCRM_WEBHOOK_SECRET`

### Form Data Extraction
The system extracts:
- Certificate counts by type (EFAW, FAW, FAWR, PFA, etc.)
- Total certificates issued
- Number of trainers renewing
- Trainer names
- Compliance checkbox responses

### Pricing Calculation
Based on 18 brackets from 0-15,000+ certificates:
- Base membership fee (varies by certificate count)
- Trainer fees: £20/trainer + 20% VAT
- All prices include VAT breakdown

### AI Analysis
Claude AI analyzes:
- Missing or unchecked compliance items
- Red flags or concerns
- Trainer details
- Overall submission quality

### Note Format
The auto-generated note includes:
```
RENEWAL FORM SUBMISSION ANALYSIS

Summary:
[AI-generated overview]

Key Metrics:
- Certificates Issued: [count]
- Trainers Renewing: [count]

Trainers:
[Names and details]

⚠️ Missing/Unchecked Items:
- [Item 1]
- [Item 2]

RENEWAL PRICING BREAKDOWN
Membership Fee ([bracket]):
  £[amount] + VAT (£[vat]) = £[total]

Trainer Fees ([count] trainers × £20):
  £[amount] + VAT (£[vat]) = £[total]

TOTAL RENEWAL COST: £[total] (inc. VAT)
```

## Pricing Brackets

| Certificates | Price (ex VAT) | Price (inc VAT) |
|--------------|----------------|-----------------|
| 0-500 | £350 | £420 |
| 501-750 | £475 | £570 |
| 751-1,000 | £575 | £690 |
| 1,001-1,500 | £700 | £840 |
| 1,501-2,000 | £1,050 | £1,260 |
| 2,001-2,500 | £1,400 | £1,680 |
| 2,501-3,000 | £1,750 | £2,100 |
| 3,001-3,500 | £2,100 | £2,520 |
| 3,501-4,000 | £2,450 | £2,940 |
| 4,001-4,500 | £2,800 | £3,360 |
| 4,501-5,000 | £3,150 | £3,780 |
| 5,001-6,000 | £3,500 | £4,200 |
| 6,001-7,000 | £3,850 | £4,620 |
| 7,001-8,000 | £4,200 | £5,040 |
| 8,001-9,000 | £4,550 | £5,460 |
| 9,001-10,000 | £4,900 | £5,880 |
| 10,001-15,000 | £5,250 | £6,300 |
| 15,000+ | £5,250 | £6,300 |

**Plus**: £20/trainer + 20% VAT

## Troubleshooting

### Webhook Not Triggering
1. Check Vercel logs: `vercel logs`
2. Verify webhook URL is correct
3. Test webhook endpoint: `curl https://your-app.vercel.app/api/webhooks/form-submission`
4. Check SheepCRM webhook configuration

### AI Analysis Failing
1. Verify `ANTHROPIC_API_KEY` is set correctly
2. Check Vercel logs for error messages
3. Ensure API key has sufficient credits

### Incorrect Pricing
1. Verify certificate counts in form submission
2. Check trainer count is correct
3. Review `scripts/test-pricing.js` output

### Note Not Appearing in SheepCRM
1. Check organization URI is correct in form submission
2. Verify SheepCRM API permissions
3. Review Vercel logs for journal creation errors

## Files Structure

```
src/
├── app/api/webhooks/
│   └── form-submission/
│       └── route.ts                 # Webhook endpoint
├── lib/
│   ├── ai-analysis.ts               # Claude AI integration
│   ├── renewal-pricing.ts           # Pricing calculation
│   ├── parse-renewal-form.ts        # Form data parser
│   └── sheepcrm.ts                  # SheepCRM client (extended)
└── types/
    └── sheepcrm.ts                  # TypeScript types

scripts/
├── test-pricing.js                  # Test pricing calculations
└── test-form-response.js            # Test form data fetching
```

## Next Steps

1. Add your Anthropic API key to environment variables
2. Configure the SheepCRM webhook
3. Test with a sample form submission
4. Monitor Vercel logs for the first few submissions
5. Adjust AI analysis prompts if needed (in `src/lib/ai-analysis.ts`)

## Support

For issues or questions:
- Check Vercel logs: `vercel logs --follow`
- Review form response structure: `node scripts/test-form-response.js`
- Test pricing: `node scripts/test-pricing.js`
