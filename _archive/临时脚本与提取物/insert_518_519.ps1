$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$base = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$docx = Get-ChildItem -LiteralPath $base -Filter '*.docx' | Select-Object -First 1
$frag518 = Join-Path $PSScriptRoot 'insert_518_fragment.xml'
$frag519 = Join-Path $PSScriptRoot 'insert_519_fragment.xml'
$tmpDir = Join-Path $env:TEMP ("ins518_" + [guid]::NewGuid().ToString())
$tmpZip = $tmpDir + '.zip'
Copy-Item -LiteralPath $docx.FullName $tmpZip -Force
Expand-Archive $tmpZip $tmpDir -Force
Remove-Item $tmpZip -Force
$xmlPath = Join-Path $tmpDir 'word\document.xml'
$xml = [IO.File]::ReadAllText($xmlPath, [Text.Encoding]::UTF8)

if ($xml -notmatch '5\.6\.18 PerceptionEventStatus') {
  $insert518 = [IO.File]::ReadAllText($frag518, [Text.Encoding]::UTF8)
  $insert519 = [IO.File]::ReadAllText($frag519, [Text.Encoding]::UTF8)
  $insert = $insert518 + $insert519
  $anchor = $xml.IndexOf('5.6.17 PerceptionEventType')
  if ($anchor -lt 0) { throw '5.6.17 not found' }
  $pos = $xml.IndexOf('MQTT', $anchor)
  while ($pos -ge 0) {
    $chunk = $xml.Substring($pos, 30)
    if ($chunk.Contains([char]0x62a5) -and $chunk.Contains([char]0x6587)) { break }
    $pos = $xml.IndexOf('MQTT', $pos + 1)
  }
  if ($pos -lt 0) { throw 'MQTT heading not found' }
  $pStart = $xml.LastIndexOf('<w:p', $pos)
  $xml = $xml.Insert($pStart, $insert)
  Write-Host 'inserted 5.6.18 and 5.6.19'
}

[IO.File]::WriteAllText($xmlPath, $xml, [Text.UTF8Encoding]::new($false))
Remove-Item $docx.FullName -Force
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmpDir, $docx.FullName)
Remove-Item $tmpDir -Recurse -Force
Write-Host 'done'
