// Simple auth check for API endpoints - MVP version
// TODO: For production, implement proper authentication:
// - Use environment variables for secrets
// - Implement JWT with refresh tokens
// - Use proper OAuth2/OpenID Connect provider
// - Never expose tokens in client-side code
// - Remove query parameter authentication (security risk)

export function checkApiAuth(req) {
    // For MVP, just check if the request includes a simple auth header
    const authHeader = req.headers.authorization;
    
    // Simple bearer token check - you can change this token
    // SECURITY WARNING: This is hardcoded for MVP only
    const validToken = 'Bearer posture-api-2025';
    
    if (authHeader === validToken) {
        return true;
    }
    
    // Also check for a simple API key in query params (for easier testing)
    // SECURITY WARNING: Query param auth is insecure (appears in logs/URLs)
    const apiKey = req.query?.apiKey;
    if (apiKey === 'posture-api-2025') {
        return true;
    }
    
    return false;
}

export function requireAuth(handler) {
    return async (req, res) => {
        if (!checkApiAuth(req)) {
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Please provide valid authentication'
            });
        }
        
        return handler(req, res);
    };
}