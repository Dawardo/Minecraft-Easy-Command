# Tiny local web server for Bedrock Dialogue Maker.
# Uses only what ships with Windows (PowerShell + .NET HttpListener), so nothing needs installing.
$ErrorActionPreference = 'Stop'

$root = [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $PSScriptRoot) 'web'))
$rootWithSep = $root.TrimEnd('\') + '\'

$listener = $null
$port = 0
foreach ($p in 8765..8785) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$p/")
        $l.Start()
        $listener = $l
        $port = $p
        break
    } catch { }
}
if (-not $listener) {
    Write-Host 'Could not find a free port between 8765 and 8785.'
    exit 1
}

$url = "http://localhost:$port/"
Write-Host "Bedrock Dialogue Maker is running at $url"
Write-Host 'Your browser should open automatically. Close this window to stop the server.'
Start-Process $url

$types = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
}

try {
    while ($listener.IsListening) {
        # Wait in short slices so Ctrl+C still works.
        $task = $listener.GetContextAsync()
        while (-not $task.AsyncWaitHandle.WaitOne(500)) { }
        $ctx = $task.GetAwaiter().GetResult()
        $res = $ctx.Response
        try {
            $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
            if ($path -eq '/') { $path = '/index.html' }
            $full = [IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart('/').Replace('/', '\'))))
            if ($full.StartsWith($rootWithSep, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
                $bytes = [IO.File]::ReadAllBytes($full)
                $ext = [IO.Path]::GetExtension($full).ToLower()
                $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
                $res.Headers.Add('Cache-Control', 'no-store')
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $msg = [Text.Encoding]::UTF8.GetBytes('Not found')
                $res.OutputStream.Write($msg, 0, $msg.Length)
            }
        } catch {
            Write-Host "Request error: $_"
        } finally {
            $res.OutputStream.Close()
        }
    }
} finally {
    $listener.Stop()
}
