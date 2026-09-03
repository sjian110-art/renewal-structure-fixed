param(
    [int]$Port = 4173
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$($Port)/")
$listener.Prefixes.Add("http://127.0.0.1:$($Port)/")

try {
    $listener.Start()
    Write-Host "Preview server running on http://localhost:$($Port)"
} catch {
    Write-Host "Failed to start listener: $_"
    exit 1
}

$Global:MimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.json' = 'application/json'
    '.mp4'  = 'video/mp4'
    '.webm' = 'video/webm'
    '.svg'  = 'image/svg+xml'
    '.woff2'= 'font/woff2'
    '.woff' = 'font/woff'
    '.ico'  = 'image/x-icon'
}

$Global:RootDir = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }
    
    $req = $context.Request
    $res = $context.Response
    
    try {
        $rawPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
        if ($rawPath.EndsWith('/') -or $rawPath -eq '') {
            $rawPath += 'index.html'
        }
        $relPath = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Global:RootDir, $relPath))
        
        if (-not $filePath.StartsWith($Global:RootDir, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $filePath -PathType Leaf)) {
            $res.StatusCode = 404
            $res.Close()
            continue
        }
        
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = if ($Global:MimeTypes.ContainsKey($ext)) { $Global:MimeTypes[$ext] } else { 'application/octet-stream' }
        $res.ContentType = $contentType
        $res.Headers.Add("Accept-Ranges", "bytes")
        
        $fileInfo = New-Object System.IO.FileInfo($filePath)
        $fileLen = $fileInfo.Length
        
        $rangeHeader = $req.Headers["Range"]
        if ($rangeHeader -and $rangeHeader -match "^bytes=(\d*)-(\d*)$") {
            $startStr = $matches[1]
            $endStr = $matches[2]
            
            $start = if ($startStr) { [int64]$startStr } else { 0 }
            $end = if ($endStr) { [int64]$endStr } else { $fileLen - 1 }
            
            if ($start -ge $fileLen -or $end -ge $fileLen -or $start -gt $end) {
                $res.StatusCode = 416
                $res.Headers.Add("Content-Range", "bytes */$fileLen")
                $res.Close()
                continue
            }
            
            $chunkSize = $end - $start + 1
            $res.StatusCode = 206
            $res.ContentLength64 = $chunkSize
            $res.Headers.Add("Content-Range", "bytes $start-$end/$fileLen")
            
            $fs = [System.IO.File]::OpenRead($filePath)
            $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
            $buffer = New-Object byte[] 65536
            $remaining = $chunkSize
            
            while ($remaining -gt 0) {
                $toRead = [Math]::Min($remaining, $buffer.Length)
                $bytesRead = $fs.Read($buffer, 0, $toRead)
                if ($bytesRead -le 0) { break }
                $res.OutputStream.Write($buffer, 0, $bytesRead)
                $remaining -= $bytesRead
            }
            $fs.Close()
        } else {
            $res.StatusCode = 200
            $res.ContentLength64 = $fileLen
            $fs = [System.IO.File]::OpenRead($filePath)
            $fs.CopyTo($res.OutputStream)
            $fs.Close()
        }
    } catch {
        try { $res.StatusCode = 500 } catch {}
    } finally {
        try { $res.Close() } catch {}
    }
}
