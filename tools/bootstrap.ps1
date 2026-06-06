Write-Host "=== ANTIGRAVITY BOOTSTRAP (PowerShell) ==="

$requiredDirs = @("rules", "directivas", "workflows", "scripts", "apps", "memory", "env", "logs", "tools")

foreach ($dir in $requiredDirs) {
    if (-not (Test-Path $dir)) {
        Write-Host "Creating missing directory: $dir"
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

if (-not (Test-Path "rules/reglas_globales.md")) {
    Write-Host "rules/reglas_globales.md is missing. Creating..."
    New-Item -ItemType File -Force -Path "rules/reglas_globales.md" -Value "# Reglas Globales" | Out-Null
}

if (-not (Test-Path "rules/governance.md")) {
    Write-Host "rules/governance.md is missing. Creating..."
    New-Item -ItemType File -Force -Path "rules/governance.md" -Value "# Governance Rules" | Out-Null
}

if (-not (Test-Path "rules/mcp")) {
    New-Item -ItemType Directory -Force -Path "rules/mcp" | Out-Null
}

$mcpFiles = @("mcp_notebooklm.md", "mcp_n8n.md", "n8n_skills.md")
foreach ($f in $mcpFiles) {
    $path = "rules/mcp/$f"
    if (-not (Test-Path $path)) {
        New-Item -ItemType File -Force -Path $path | Out-Null
    }
}

Write-Host "Bootstrap completed successfully."
exit 0
