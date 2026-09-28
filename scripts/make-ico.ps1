$pngBytes = [System.IO.File]::ReadAllBytes('public\icon-192.png')
$icoStream = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($icoStream)

# ICO Header
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type 1 = ICO
$bw.Write([uint16]1) # 1 image

# Icon Directory Entry
$bw.Write([byte]192) # Width
$bw.Write([byte]192) # Height
$bw.Write([byte]0)   # Colors
$bw.Write([byte]0)   # Reserved
$bw.Write([uint16]1) # Planes
$bw.Write([uint16]32)# BPP
$bw.Write([uint32]$pngBytes.Length) # Image size
$bw.Write([uint32]22) # Image offset (6 + 16 = 22)

# PNG Data
$bw.Write($pngBytes)
$bw.Flush()

[System.IO.File]::WriteAllBytes('public\app.ico', $icoStream.ToArray())
[System.IO.File]::WriteAllBytes('scripts\app.ico', $icoStream.ToArray())
Write-Output "ICO Created: $((Get-Item public\app.ico).Length) bytes"
