# Manual Workflow Update - Assessor Application Analyzer

## Change Summary

The Assessor Application system has been **converted from an automatic dashboard to a manual URI-entry workflow**, matching the Renewal Analyzer's user experience.

### Why This Change?

- **No webhooks yet**: SheepCRM webhooks are not currently configured
- **Immediate usability**: Works right now without webhook setup
- **Familiar workflow**: Same process as Renewal Analyzer
- **Simple and effective**: Paste URI → Analyze → Review → Post

---

## How It Works Now

### 1. Navigate to "Assessor Analyzer"
- Click "Assessor Analyzer" in the sidebar
- Opens: `/assessor-applications`

### 2. Paste Form Response URI
- Copy the form response URI from SheepCRM
- Format: `/faib/form_response/68ff8f0f5f0364f42f8f5359/`
- Paste into the input field

### 3. Click "Analyze Application"
- System fetches application from SheepCRM (~5 seconds)
- Parses all form data and documents
- Runs AI analysis (~8-10 seconds)
- Displays complete results

### 4. Review Results
You'll see:
- **Applicant Information**: Name, submission date, status
- **Personal Details**: Email, phone, address, DOB
- **Uploaded Documents**: Required and additional files (with download links)
- **AI Analysis**:
  - Summary of application quality
  - Required documents checklist (✅/❌)
  - Strengths identified
  - Compliance issues flagged
  - Recommendation (approve/reject/request more info)
- **Review Note**: AI-generated review (editable)

###5. Edit Review (Optional)
- The AI-generated review appears in a text area
- Edit as needed to add your own observations
- Review is in markdown format

### 6. Post to SheepCRM
- Click "Post Review to SheepCRM"
- Review is saved to the form's `overall_internal_comments` field
- Accessible from SheepCRM "Comments" tab
- Success message confirms posting

---

## What Changed from Previous Version

### Before (Automatic Dashboard)
```
1. System auto-fetches all applications from form
2. User browses dashboard
3. Clicks on an application
4. Views details in tabs
5. Generates AI review
6. Posts to SheepCRM
```

### Now (Manual URI Entry)
```
1. User pastes form response URI
2. Clicks "Analyze Application"
3. Everything loads at once (single page)
4. Edits review if needed
5. Posts to SheepCRM
```

---

## Files Changed

### New Files
- `src/app/api/assessor-applications/analyze-manual/route.ts` - Combined analysis endpoint
- `scripts/test-assessor-manual.js` - Test script for new workflow

### Modified Files
- `src/app/assessor-applications/page.tsx` - Complete rewrite (URI input style)
- `src/components/layout/Sidebar.tsx` - Updated name to "Assessor Analyzer"

### Deleted Files
- `src/app/assessor-applications/[id]/page.tsx` - No longer needed

### Kept (For Future Use)
- `src/app/api/assessor-applications/route.ts` - List endpoint (for when webhooks are setup)
- `src/app/api/assessor-applications/[id]/route.ts` - Get endpoint
- `src/app/api/assessor-applications/[id]/analyze/route.ts` - Analyze endpoint
- `src/app/api/assessor-applications/[id]/review/route.ts` - Review endpoint

---

## API Endpoint

### POST `/api/assessor-applications/analyze-manual`

**Request:**
```json
{
  "formResponseUri": "/faib/form_response/68ff8f0f5f0364f42f8f5359/",
  "postToSheepCRM": false  // or true to post immediately
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applicant": {
      "uri": "...",
      "name": "Clare Addison"
    },
    "application": {
      "uri": "...",
      "status": "submitted",
      "submissionDate": "2025-10-27",
      "personalInfo": { ... },
      "qualifications": { ... },
      "attachments": {
        "required": [...],
        "additional": [...]
      }
    },
    "analysis": {
      "summary": "...",
      "requiredDocuments": [...],
      "complianceIssues": [...],
      "strengths": [...],
      "recommendation": "request_more_info",
      "recommendationReason": "..."
    },
    "note": {
      "content": "Full review text...",
      "posted": false
    }
  }
}
```

---

## User Benefits

✅ **Faster Setup**: Works immediately without webhooks
✅ **Simple Workflow**: One page, straightforward process
✅ **Familiar**: Same as Renewal Analyzer
✅ **Full Control**: See everything before posting
✅ **Editable**: Modify AI review as needed
✅ **Same AI Quality**: Full document analysis
✅ **Time Saving**: Still 10-15 minutes → 15 seconds

---

## Future Enhancement (When Webhooks Are Ready)

When you're ready to set up webhooks, you can:
1. Configure SheepCRM webhook for form submissions
2. Create dashboard that auto-fetches applications
3. Add back the browse/click workflow
4. Keep manual entry as backup option

All the API endpoints for this are already built and ready to use!

---

## Testing

**Test Script:**
```bash
node scripts/test-assessor-manual.js
```

**Manual Testing:**
1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/assessor-applications`
3. Paste URI: `/faib/form_response/68ff8f0f5f0364f42f8f5359/`
4. Click "Analyze Application"
5. Review results
6. Edit review note
7. Click "Post Review to SheepCRM"

---

## Migration Guide

If you had the old version deployed:
- **No data loss**: Nothing is deleted from SheepCRM
- **Same reviews**: AI analysis quality unchanged
- **New workflow**: Just paste URIs instead of browsing
- **Same output**: Reviews still go to internal comments

---

**Updated**: 2025-10-27
**Status**: ✅ Ready for Production
