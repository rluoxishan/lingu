# 本地 Mock 北斗回调：监听 9090，打印 POST body
$prefix = "http://127.0.0.1:9090/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Mock Beidou listening on ${prefix}callback (Ctrl+C to stop)"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  $body = ""
  if ($request.HasEntityBody) {
    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
    $body = $reader.ReadToEnd()
    $reader.Close()
  }
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$ts] $($request.HttpMethod) $($request.Url.PathAndQuery)"
  if ($body) { Write-Host $body }
  Write-Host "---"
  $tsMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $buffer = [System.Text.Encoding]::UTF8.GetBytes("{`"code`":1000,`"msg`":`"success`",`"timestamp`":$tsMs}")
  $response.ContentLength64 = $buffer.Length
  $response.OutputStream.Write($buffer, 0, $buffer.Length)
  $response.Close()
}
