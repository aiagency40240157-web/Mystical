#!/bin/bash
# Bootstrap script for Antigravity environment compliance.
set -e

echo "=== ANTIGRAVITY BOOTSTRAP ==="

# 1. Create required structure
REQUIRED_DIRS=(
  "rules"
  "directivas"
  "workflows"
  "scripts"
  "apps"
  "memory"
  "env"
  "logs"
  "tools"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "Creating missing directory: $dir"
    mkdir -p "$dir"
  fi
done

# 2. Verify critical files
if [ ! -f "rules/reglas_globales.md" ]; then
  echo "rules/reglas_globales.md is missing. Creating..."
  cat << 'EOF' > rules/reglas_globales.md
# 📜 REGLAS GLOBALES ANTIGRAVITY (SOP)
EOF
fi

if [ ! -f "rules/governance.md" ]; then
  echo "rules/governance.md is missing. Creating..."
  cat << 'EOF' > rules/governance.md
# Governance Rules
EOF
fi

# Ensure MCP documentation directories exist
mkdir -p rules/mcp
touch rules/mcp/mcp_notebooklm.md
touch rules/mcp/mcp_n8n.md
touch rules/mcp/n8n_skills.md

echo "Bootstrap completed successfully."
exit 0
