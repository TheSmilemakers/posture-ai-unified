#!/bin/bash
# Quick script to restore MCP servers for Posture AI project

echo "Restoring MCP servers configuration..."

# Add global (user-scope) servers
echo "Adding global MCP servers..."
claude mcp add -s user filesystem npx -- -y @modelcontextprotocol/server-filesystem --allowed-directories /Users/rajan/Documents
claude mcp add -s user brave-search npx -- -y @modelcontextprotocol/server-brave-search
claude mcp add -s user github --env GITHUB_PERSONAL_ACCESS_TOKEN='${GITHUB_PERSONAL_ACCESS_TOKEN}' -- npx -y @modelcontextprotocol/server-github
claude mcp add -s user browsermcp -- npx @browsermcp/mcp@latest

# Add project-specific servers
echo "Adding project-specific MCP servers..."
claude mcp add -s project supabase \
  --env SUPABASE_URL=https://anxeptegnpfroajjzuqk.supabase.co \
  --env SUPABASE_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGVwdGVnbnBmcm9hamp6dXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDcxOTY2MCwiZXhwIjoyMDY2Mjk1NjYwfQ.Em6tTSQICYvQALAg1WlAjYoiQjGk2nYJSweSfkg1plQ \
  -- npx -y @supabase/mcp-server-supabase@latest

claude mcp add -s project context7 \
  --env CONTEXT7_API_KEY=ctx7sk-a5b76a76-f808-480c-8318-0f75937441cf \
  -- npx -y @upstash/context7-mcp

echo "MCP servers configured! Listing current servers:"
claude mcp list

echo ""
echo "⚠️  IMPORTANT: Please restart Claude Code for the changes to take effect."
echo ""
echo "📝 NOTES:"
echo "  • For GitHub MCP: Set GITHUB_PERSONAL_ACCESS_TOKEN environment variable"
echo "  • For Browser MCP: Install the Chrome extension from https://browsermcp.io"
echo ""
echo "You can also add more servers like:"
echo "  - Git: claude mcp add -s user git -- uvx mcp-server-git --repository /Users/rajan/Documents"
echo "  - Memory: claude mcp add -s user memory -- npx -y @modelcontextprotocol/server-memory"