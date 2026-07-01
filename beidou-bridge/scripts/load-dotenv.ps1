#Requires -Version 5.1
param(
  [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
)

$envPath = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envPath)) {
  return $false
}

Get-Content $envPath -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $eq = $line.IndexOf("=")
  if ($eq -le 0) { return }
  $key = $line.Substring(0, $eq).Trim()
  $value = $line.Substring($eq + 1).Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  $current = [Environment]::GetEnvironmentVariable($key, "Process")
  if ([string]::IsNullOrEmpty($current)) {
    [Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}

return $true
