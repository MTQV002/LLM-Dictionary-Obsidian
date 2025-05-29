# Script to manually install plugin to Obsidian

$VaultName = Read-Host "Enter your Obsidian vault name"
$PluginPath = "$env:APPDATA\obsidian\$VaultName\.obsidian\plugins\llm-dictionary"

# Create plugin directory
New-Item -ItemType Directory -Force -Path $PluginPath

# Copy files
Copy-Item "main.js" -Destination $PluginPath
Copy-Item "manifest.json" -Destination $PluginPath
Copy-Item "styles.css" -Destination $PluginPath

Write-Host "Plugin installed to: $PluginPath"
Write-Host "Please restart Obsidian and enable the plugin in Settings > Community Plugins"
