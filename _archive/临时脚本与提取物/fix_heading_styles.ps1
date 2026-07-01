# Fix §5.6.17/18/19 heading styles (Word navigation pane)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$base = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$docx = Get-ChildItem -LiteralPath $base -Filter '*.docx' | Select-Object -First 1
$tmpDir = Join-Path $env:TEMP ("docxfix_" + [guid]::NewGuid().ToString())
$tmpZip = $tmpDir + '.zip'
Copy-Item -LiteralPath $docx.FullName $tmpZip -Force
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force
Remove-Item $tmpZip -Force

$xmlPath = Join-Path $tmpDir 'word\document.xml'
$xml = [IO.File]::ReadAllText($xmlPath, [Text.Encoding]::UTF8)
$H4 = '00000e'
$FONT = '微软雅黑'

function Make-H4([string]$text) {
    $t = $text.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;')
    return "<w:p><w:pPr><w:pStyle w:val=`"$H4`"/><w:spacing w:before=`"80`" w:after=`"40`"/><w:rPr/></w:pPr><w:r><w:rPr><w:rFonts w:ascii=`"$FONT`" w:hAnsi=`"$FONT`" w:eastAsia=`"$FONT`"/><w:b w:val=`"1`"/><w:sz w:val=`"22`"/></w:rPr><w:t>$t</w:t></w:r></w:p>"
}

function Get-Paragraphs([string]$xml) {
    $list = @()
    $re = [regex]'(?s)<w:p[^>]*>.*?</w:p>'
    foreach ($m in $re.Matches($xml)) {
        $inner = $m.Value
        $text = ([regex]::Matches($inner, '<w:t[^>]*>([^<]*)</w:t>') | ForEach-Object { $_.Groups[1].Value }) -join ''
        if (-not $text) { continue }
        $styleM = [regex]::Match($inner, '<w:pStyle w:val="([^"]+)"')
        $style = if ($styleM.Success) { $styleM.Groups[1].Value } else { '' }
        $list += [pscustomobject]@{ Full = $inner; Text = $text; Style = $style }
    }
    return $list
}

foreach ($prefix in @('5.6.17 PerceptionEventType', '5.6.18 PerceptionEventStatus', '5.6.19 AlarmTaskType')) {
    $p = Get-Paragraphs $xml | Where-Object { $_.Text.StartsWith($prefix) } | Select-Object -First 1
    if (-not $p) { Write-Host "MISSING: $prefix"; continue }
    if ($p.Style -eq $H4) { Write-Host "OK: $prefix"; continue }
    $xml = $xml.Replace($p.Full, (Make-H4 $p.Text))
    Write-Host "Fixed: $prefix"
}

[IO.File]::WriteAllText($xmlPath, $xml, [Text.UTF8Encoding]::new($false))

# Repack docx (preserve folder structure)
if (Test-Path $docx.FullName) { Remove-Item $docx.FullName -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmpDir, $docx.FullName)
Remove-Item $tmpDir -Recurse -Force
Write-Host "Saved:" $docx.FullName
