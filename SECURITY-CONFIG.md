# Security Configuration Guide

## API Key Management

### Current State (Development)
The application currently uses a hardcoded API key for development purposes. This MUST be changed before production deployment.

### Production Setup

1. **Environment Variables (Recommended for Vercel)**
   ```bash
   # In Vercel dashboard or .env.local file
   POSTURE_API_KEY=your-secure-api-key-here
   ```

2. **Update API Endpoints**
   Modify your Vercel API endpoints to inject the API key server-side:
   ```javascript
   // api/auth-check.js
   const API_KEY = process.env.POSTURE_API_KEY;
   ```

3. **Client-Side Configuration**
   For production, consider one of these approaches:
   - Proxy all API calls through your Vercel functions
   - Use a public key that only works from your domain
   - Implement OAuth2 flow for user-specific tokens

### Security Checklist
- [ ] Rotate the exposed API key immediately
- [ ] Never commit real API keys to source control
- [ ] Use environment variables for all secrets
- [ ] Implement proper CORS headers
- [ ] Add rate limiting to API endpoints
- [ ] Monitor for unauthorized API usage

### Deployment Steps
1. Set up environment variable in Vercel dashboard
2. Update all API endpoints to use `process.env.POSTURE_API_KEY`
3. Remove any hardcoded keys from client-side code
4. Test thoroughly in staging environment
5. Deploy with confidence

## Additional Security Headers
See index.html for implemented security headers including CSP, HSTS, and X-Frame-Options.