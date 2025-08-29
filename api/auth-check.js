// Simple auth check for API endpoints - MVP version

export function checkApiAuth(req) {
    // For MVP, just check if the request includes a simple auth header
    const authHeader = req.headers.authorization;
    
    // Simple bearer token check - you can change this token
    const validToken = 'Bearer posture-api-2025';
    
    if (authHeader === validToken) {
        return true;
    }
    
    // Also check for a simple API key in query params (for easier testing)
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