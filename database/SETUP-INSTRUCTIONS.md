# 🚀 Database Setup Instructions

## Quick Start (Manual Setup - Recommended)

Since Supabase MCP requires a personal access token (different from your service role key), the fastest way to set up is:

### 1. Run Schema in Supabase Dashboard

1. **Go to SQL Editor**: https://anxeptegnpfroajjzuqk.supabase.co/project/anxeptegnpfroajjzuqk/editor
2. Click **"New query"**
3. Copy ALL contents from `database/quick-setup.sql`
4. Click **"Run"**
5. You should see success messages in the output

### 2. Verify Setup

```bash
# Install dependencies first (if not already done)
npm install

# Test database connection
npm run test:db
```

You should see:
- ✅ All tables found
- ✅ Test patient created successfully

### 3. Test the Backend

```bash
# Start local server
npm run dev

# Open in browser
http://localhost:8000/test-backend.html
```

## MCP Setup (Optional - For Later)

The Supabase MCP requires a **personal access token**, not the service role key:

### Getting Your Personal Access Token:
1. Go to https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name (e.g., "posture-app-mcp")
4. Copy the token

### Configure MCP:
1. Edit `.mcp.json` in the project root
2. Replace `YOUR_PERSONAL_ACCESS_TOKEN_HERE` with your token
3. Restart Claude Code

## API Testing Guide

### Test Endpoints:
- `GET /api/test-db` - Check database connection
- `POST /api/patients/create` - Create a patient
- `POST /api/assessments/create` - Start an assessment
- `POST /api/assessments/analyze` - Store analysis results

### Example API Calls:

```javascript
// Create a patient
fetch('/api/patients/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
});

// Create assessment
fetch('/api/assessments/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patientId: 'patient-uuid-here',
    assessmentType: 'clinical'
  })
});
```

## Database Structure

All tables are prefixed with `pra_` to avoid conflicts:

- `pra_clinics` - Clinic information
- `pra_clinicians` - Staff accounts
- `pra_patients` - Patient records
- `pra_assessments` - Posture analysis sessions
- `pra_measurements` - Biomechanical data
- `pra_exercise_prescriptions` - Treatment plans
- `pra_audit_logs` - Activity tracking

## Test Data

The schema includes:
- Test Clinic ID: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- Test Clinician ID: `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the entire `quick-setup.sql` file
- Check you're connected to the right Supabase project

### API returns 500 errors
- Verify environment variables are set correctly
- Check that all tables were created
- Look at browser console for detailed errors

### MCP not working
- You need a personal access token, not service role key
- Token must have appropriate permissions
- Check `.mcp.json` format is correct

## Next Steps

1. ✅ Database schema created
2. ✅ API endpoints ready
3. ⏳ Implement authentication
4. ⏳ Add frontend integration
5. ⏳ Enable production security

## Security Notes

**For Testing Only**:
- Current RLS policies allow all authenticated users
- No PHI encryption enabled yet
- Using test email domain (@test.com)

**Before Production**:
- Enable proper RLS policies
- Implement PHI encryption
- Set up 2FA for clinicians
- Configure CORS properly
- Enable audit logging