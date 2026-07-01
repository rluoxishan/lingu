# Shared helpers for PowerShell scripts (ASCII-safe, no UTF-8 BOM required)

function Get-DefaultCloudTenantName {
  # Unicode: super admin tenant label (avoid non-ASCII literals in .ps1 source)
  return -join @(
    [char]0x8D85, [char]0x7EA7, [char]0x7BA1, [char]0x7406, [char]0x5458
  )
}

function Get-ResolvedCloudTenantName {
  param([string]$TenantName)
  if ([string]::IsNullOrWhiteSpace($TenantName)) {
    return Get-DefaultCloudTenantName
  }
  return $TenantName
}

function Test-PlaceholderCloudCredentials {
  param(
    [string]$Username,
    [string]$Password
  )
  return (
    -not $Username -or $Username -eq "your-user" `
    -or -not $Password -or $Password -eq "your-password"
  )
}

function Test-DotEnvPlaceholderFile {
  param([string]$EnvPath)
  if (-not (Test-Path $EnvPath)) { return $true }
  $user = $null
  $pass = $null
  Get-Content $EnvPath -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    if ($line -match '^CLOUD_USERNAME=(.+)$') { $user = $Matches[1].Trim() }
    if ($line -match '^CLOUD_PASSWORD=(.+)$') { $pass = $Matches[1].Trim() }
  }
  return (Test-PlaceholderCloudCredentials -Username $user -Password $pass)
}

function Invoke-JsonPostUtf8 {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers = @{},
    [Parameter(Mandatory = $true)]$BodyObject
  )
  $json = $BodyObject | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $hdr = @{}
  foreach ($k in $Headers.Keys) { $hdr[$k] = $Headers[$k] }
  $hdr["Content-Type"] = "application/json; charset=utf-8"
  return Invoke-RestMethod -Method POST -Uri $Uri -Headers $hdr -Body $bytes
}
