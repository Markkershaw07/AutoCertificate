# Trainer/Assessor Application Review System

## Overview

The Trainer/Assessor Application Review System allows you to review submitted applications directly within the FAIB Internal Tools, view uploaded documents inline, and generate AI-powered reviews that are posted to SheepCRM's internal comments field.

## Features

- **Dashboard View**: Browse all Trainer/Assessor application submissions
- **Detailed Application View**: See all form data, personal information, and qualifications
- **Document Viewer**: View and download all uploaded documents (required + additional)
- **AI-Powered Analysis**: Generate comprehensive reviews using Claude AI
- **Review Editor**: Edit AI-generated reviews before posting
- **SheepCRM Integration**: Post reviews directly to form's internal comments

## Getting Started

### 1. Configuration

The system uses your existing SheepCRM and Anthropic API credentials. No additional configuration needed!

Required environment variables (already set in `.env.local`):
```
SHEEPCRM_API_KEY=your_key
SHEEPCRM_BUCKET=faib
ANTHROPIC_API_KEY=your_key
```

### 2. Important: Update Form URI

Before using the system, you need to update the form URI in the list endpoint:

**File**: `src/app/api/assessor-applications/route.ts`

**Line to update**:
```typescript
const formUri = '/faib/form/' // You'll need the actual form URI
```

**How to find your form URI**:
1. Go to SheepCRM
2. Navigate to your Trainer/Assessor application form
3. The URI will be in format: `/faib/form/{form_id}/`
4. Copy this full URI and replace the placeholder in the code

Example:
```typescript
const formUri = '/faib/form/abc123def456/`
```

## Using the System

### Navigation

Access the system from the sidebar:
- Click **"Assessor Applications"** in the left sidebar

### Dashboard Features

#### View All Applications
- See a list of all submitted Trainer/Assessor applications
- Each card shows:
  - Applicant name
  - Submission date
  - Status (submitted, accepted, rejected, etc.)
  - Whether it has existing reviews

#### Filter & Search
- **Search**: Find applications by applicant name or form ID
- **Status Filter**: Filter by submission status
- **Refresh**: Reload the list to see new submissions

### Reviewing an Application

#### 1. Open Application Details
Click on any application card to view the full details.

#### 2. View Application Tab
- **Personal Information**: Name, email, phone, address, DOB
- **Qualifications**: First Aid certs, teaching qualifications, other quals
- Auto-extracted from form fields

#### 3. View Attachments Tab
**Required Documents**:
- Lists all documents uploaded in required fields
- Typically includes:
  - First Aid certificates
  - Teaching/Assessor qualifications
  - DBS checks
  - ID documents
  - Insurance certificates

**Additional Documents**:
- Any extra files uploaded by the applicant
- Automatically detected and listed separately
- Noted in AI review for your awareness

**Actions**:
- Click "View/Download" to open any document in a new tab
- Documents open directly from SheepCRM storage

#### 4. Generate AI Review
Click **"Generate AI Review"** to analyze the application:

**What the AI Checks**:
- Required documents present/missing
- Form data completeness
- Compliance issues
- Application strengths
- Recommendation (approve/reject/request more info)

**AI Review Includes**:
- Summary of application
- Required documents checklist (✅/❌)
- Additional documents noted
- Strengths identified
- Issues/concerns flagged
- Clear recommendation with reasoning

#### 5. Edit Review (Optional)
- AI-generated review appears in the Comments tab
- Edit the review text as needed
- Add your own notes or observations
- Review is fully customizable before posting

#### 6. Post to SheepCRM
Click **"Post Review to SheepCRM"**:
- Review is saved to form's `overall_internal_comments` field
- Visible in SheepCRM when viewing the form response
- Accessible from the "Comments" section in SheepCRM UI
- Does not overwrite existing comments (appends)

## API Endpoints

The system provides these REST API endpoints:

### List Applications
```
GET /api/assessor-applications
Query params: ?status=submitted&limit=50
```

### Get Single Application
```
GET /api/assessor-applications/[id]
```

### Analyze Application
```
POST /api/assessor-applications/[id]/analyze
```

### Post Review
```
POST /api/assessor-applications/[id]/review
Body: { reviewContent: string, updateStatus?: 'accepted'|'rejected' }
```

## Form Parser Configuration

The system automatically detects common field patterns. If your form uses different field names, update:

**File**: `src/lib/parse-assessor-form.ts`

**Field Patterns** (lines 36-65):
```typescript
const requiredPatterns = [
  'first-aid-certificate',
  'teaching-qualification',
  // Add your custom patterns here
]
```

## Required Documents Checklist

Customize which documents are considered "required":

**File**: `src/lib/parse-assessor-form.ts`

**Function**: `getRequiredDocumentChecklist()` (line 172):
```typescript
export function getRequiredDocumentChecklist(): string[] {
  return [
    'First Aid Certificate',
    'Teaching/Assessor Qualification',
    'DBS Check',
    'Proof of Identity',
    'Professional Indemnity Insurance'
    // Add/remove items as needed
  ]
}
```

## Testing

### Test Script
Run the included test script to verify the system:

```bash
node scripts/test-assessor-application.js
```

This will:
1. Fetch the example application
2. Run AI analysis
3. Display the generated review
4. Confirm all endpoints are working

### Manual Testing
1. Start the dev server: `npm run dev`
2. Open: http://localhost:3000/assessor-applications
3. Click on an application
4. Generate AI review
5. Post review to SheepCRM
6. Verify in SheepCRM that the comment appears

## Troubleshooting

### "No applications found"
**Solution**: Update the form URI in `src/app/api/assessor-applications/route.ts` (see step 2 above)

### "Failed to fetch application"
**Possible causes**:
- Invalid form response ID
- SheepCRM API credentials not configured
- Form response doesn't exist

**Check**:
- Verify the form response URI is correct
- Check `.env.local` has valid `SHEEPCRM_API_KEY`

### "AI analysis failed"
**Possible causes**:
- Anthropic API key not configured
- API rate limit reached
- Network connectivity issue

**Check**:
- Verify `ANTHROPIC_API_KEY` in `.env.local`
- Check console logs for specific error message

### Documents not appearing
**Possible causes**:
- Form doesn't have file upload fields
- Field names don't match patterns in parser

**Solution**:
- Update field patterns in `parse-assessor-form.ts`
- Add your specific field names to `requiredPatterns` or `additionalPatterns`

### Review not posting to SheepCRM
**Possible causes**:
- Invalid form response URI
- SheepCRM API permissions
- Form response is withdrawn

**Check**:
- Verify form status is not "withdrawn"
- Check SheepCRM API logs
- Ensure API key has write permissions

## Architecture

```
Assessor Applications System
│
├── Frontend (React/Next.js)
│   ├── /assessor-applications (Dashboard)
│   └── /assessor-applications/[id] (Detail View)
│
├── API Routes
│   ├── GET /api/assessor-applications (List)
│   ├── GET /api/assessor-applications/[id] (Single)
│   ├── POST /api/assessor-applications/[id]/analyze (AI)
│   └── POST /api/assessor-applications/[id]/review (Post)
│
├── Utilities
│   ├── parse-assessor-form.ts (Form parser)
│   ├── assessor-analysis.ts (AI analysis)
│   └── sheepcrm.ts (SheepCRM client)
│
└── Types
    ├── assessor-application.ts (TypeScript types)
    └── sheepcrm.ts (SheepCRM types)
```

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Actions**: Review multiple applications at once
2. **Status Updates**: Change application status directly from UI
3. **Email Notifications**: Auto-email applicants when reviewed
4. **Document Preview**: Inline PDF/image preview without downloads
5. **Review Templates**: Saved review templates for common scenarios
6. **Dashboard Analytics**: Stats on approval rates, common issues, etc.
7. **Assignee Management**: Assign applications to specific reviewers

## Support

For issues or questions:
- Check this guide first
- Review the test script output: `node scripts/test-assessor-application.js`
- Check console logs in browser dev tools
- Verify environment variables are set correctly

## Related Documentation

- [Main README](README.md) - Overall project documentation
- [Renewal Analyzer Setup](RENEWAL_ANALYZER_SETUP.md) - Similar AI analysis system
- [SheepCRM API Docs](https://docs.sheepcrm.com) - SheepCRM API reference
