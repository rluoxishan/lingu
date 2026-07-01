# Fix md-to-docx broken tables: gridCol and tcW are both w:w="100".
param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [string]$OutputPath = $InputPath
)

$TABLE_WIDTH = 9360  # ~16.5cm content width

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Fix-DocumentXml([string]$Xml) {
  return [regex]::Replace($Xml, '<w:tbl>([\s\S]*?)</w:tbl>', {
    param($m)
    $block = $m.Value

    $gridMatch = [regex]::Match($block, '<w:tblGrid>([\s\S]*?)</w:tblGrid>')
    if (-not $gridMatch.Success) { return $block }

    $colCount = ([regex]::Matches($gridMatch.Groups[1].Value, '<w:gridCol')).Count
    if ($colCount -le 0) { return $block }

    $base = [math]::Floor($TABLE_WIDTH / $colCount)
    $remainder = $TABLE_WIDTH - ($base * $colCount)
    $widths = @(0..($colCount - 1) | ForEach-Object {
      $base + ($(if ($_ -lt $remainder) { 1 } else { 0 }))
    })

    $newGrid = '<w:tblGrid>' + (($widths | ForEach-Object { "<w:gridCol w:w=`"$_`"/>" }) -join '') + '</w:tblGrid>'
    $fixed = [regex]::Replace($block, '<w:tblGrid>[\s\S]*?</w:tblGrid>', $newGrid)

    $fixed = $fixed -replace '<w:tblLayout w:type="autofit"/>', '<w:tblLayout w:type="fixed"/>'
    $fixed = $fixed -replace '<w:tblW w:w="0" w:type="auto"/>', "<w:tblW w:w=`"$TABLE_WIDTH`" w:type=`"dxa`"/>"
    $fixed = $fixed -replace '<w:tblW w:type="dxa" w:w="9746"/>', "<w:tblW w:w=`"$TABLE_WIDTH`" w:type=`"dxa`"/>"

    # Fix each cell width in row order (left to right per row)
    $colIdx = 0
    $fixed = [regex]::Replace($fixed, '<w:tc>([\s\S]*?)</w:tc>', {
      param($cm)
      $cell = $cm.Value
      $w = $widths[$colIdx % $colCount]
      $colIdx++
      if ($cell -match '<w:tcW[^/]*/>') {
        return [regex]::Replace($cell, '<w:tcW[^/]*/>', "<w:tcW w:w=`"$w`" w:type=`"dxa`"/>")
      }
      return [regex]::Replace($cell, '<w:tcPr>', "<w:tcPr><w:tcW w:w=`"$w`" w:type=`"dxa`"/>", 1)
    })

    return $fixed
  })
}

function Repack-Docx([string]$SourceDocx, [string]$UnzDir, [string]$DestDocx) {
  if (Test-Path $DestDocx) { Remove-Item -LiteralPath $DestDocx -Force }
  $archive = [System.IO.Compression.ZipFile]::Open($DestDocx, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Get-ChildItem -Path $UnzDir -Recurse -File | ForEach-Object {
      $rel = $_.FullName.Substring($UnzDir.Length + 1).Replace('\', '/')
      [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
    }
  } finally {
    $archive.Dispose()
  }
}

$InputPath = (Resolve-Path -LiteralPath $InputPath).Path
$OutputPath = [System.IO.Path]::GetFullPath($(if ($OutputPath) { $OutputPath } else { $InputPath }))

$tmp = Join-Path $env:TEMP ("docx-fix-" + [guid]::NewGuid().ToString())
$unzPath = Join-Path $tmp "unz"
New-Item -ItemType Directory -Path $unzPath -Force | Out-Null

$zip = [System.IO.Compression.ZipFile]::OpenRead($InputPath)
try {
  foreach ($entry in $zip.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    $dest = Join-Path $unzPath ($entry.FullName.Replace('/', [IO.Path]::DirectorySeparatorChar))
    $dir = Split-Path $dest -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
  }
} finally {
  $zip.Dispose()
}

$docXmlPath = Join-Path $unzPath "word\document.xml"
$xml = [System.IO.File]::ReadAllText($docXmlPath, [System.Text.UTF8Encoding]::new($false))
$fixed = Fix-DocumentXml $xml
[System.IO.File]::WriteAllText($docXmlPath, $fixed, [System.Text.UTF8Encoding]::new($false))

$outTmp = Join-Path $tmp "out.docx"
Repack-Docx -SourceDocx $InputPath -UnzDir $unzPath -DestDocx $outTmp
Copy-Item -LiteralPath $outTmp -Destination $OutputPath -Force
Remove-Item $tmp -Recurse -Force
Write-Host "Fixed: $OutputPath"
