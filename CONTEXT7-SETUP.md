# Context7 MCP Setup Guide

## Overview

Context7 MCP has been added to your Posture Rehab AI project to provide real-time, version-specific documentation for all the libraries you're using. This ensures you always get accurate, up-to-date code examples and API references.

## Configuration Added

The following configuration has been added to `.mcp.json`:

```json
"context7": {
    "command": "npx",
    "args": [
        "-y",
        "@upstash/context7-mcp"
    ],
    "env": {
        "CONTEXT7_API_KEY": "YOUR_CONTEXT7_API_KEY_HERE"
    }
}
```

## Setup Steps

### 1. Get a Context7 API Key (Optional but Recommended)

1. Visit [context7.com/dashboard](https://context7.com/dashboard)
2. Sign up for a free account
3. Copy your API key
4. Replace `YOUR_CONTEXT7_API_KEY_HERE` in `.mcp.json` with your actual key

**Note**: Context7 works without an API key but has rate limits. An API key provides higher limits.

### 2. Restart Claude Code

After updating the configuration, restart Claude Code for the changes to take effect.

### 3. Verify Installation

You can verify Context7 is working by using it in a prompt:

```
"Show me how to create a Supabase client in JavaScript use context7"
```

## Usage Examples for Your Project

### Get Supabase Documentation
```
"Show me the latest Supabase JavaScript client authentication methods use context7"
```

### MediaPipe Documentation
```
"Get the current MediaPipe Pose detection options and configuration use context7"
```

### Vercel API Routes
```
"Show me the latest Vercel Edge Functions API documentation use context7"
```

### jsPDF Documentation
```
"Get jsPDF methods for creating PDF reports with images use context7"
```

## Benefits for Posture Rehab AI

1. **Accurate Supabase Integration**: Get the latest Supabase client methods
2. **MediaPipe Updates**: Stay current with pose detection API changes
3. **Vercel Best Practices**: Latest serverless function patterns
4. **Library Version Matching**: Documentation matches your package.json versions

## Common Libraries in Your Project

Context7 can provide documentation for:
- `@supabase/supabase-js` (v2.45.7)
- `@mediapipe/pose` (latest)
- `jspdf` (v2.5.2)
- Vercel API Routes
- JavaScript ES6+ features
- CSS modern features
- Web APIs (Canvas, WebRTC, etc.)

## Troubleshooting

### If Context7 is not working:

1. **Check MCP server status**:
   ```bash
   claude mcp list
   ```

2. **Verify network connection** to https://mcp.context7.com

3. **Check API key** if you're using one

4. **Restart Claude Code** after configuration changes

## Alternative Setup Methods

### Using HTTP Transport (if NPX doesn't work):
```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

### Using SSE Transport:
```bash
claude mcp add --transport sse context7 https://mcp.context7.com/sse
```

## Best Practices

1. **Always append "use context7"** when you need current documentation
2. **Specify versions** when asking about specific library versions
3. **Use for API references** when implementing new features
4. **Check migration guides** when updating dependencies

## Integration with Your Workflow

When working on:
- **Backend Integration**: `"Supabase Row Level Security policies use context7"`
- **UI Updates**: `"CSS Container Queries syntax use context7"`
- **PDF Generation**: `"jsPDF text positioning methods use context7"`
- **API Development**: `"Vercel Edge Runtime limitations use context7"`

Context7 ensures you're always working with accurate, current information!