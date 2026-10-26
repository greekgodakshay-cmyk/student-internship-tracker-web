param(
    [string]$SourcePath = "public\images\student-tracker-logo.png",
    [string]$OutputPath = "desktop\assets\icon.ico"
)

Add-Type -AssemblyName System.Drawing

$fullSrc = [System.IO.Path]::GetFullPath($SourcePath)
$fullOut = [System.IO.Path]::GetFullPath($OutputPath)

$srcImg = [System.Drawing.Image]::FromFile($fullSrc)
$sizes = @(256, 128, 64, 48, 32, 16)
$imageBytesList = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $imageBytesList += ,@($size, $ms.ToArray())
    $ms.Dispose()
}
$srcImg.Dispose()

$outDir = [System.IO.Path]::GetDirectoryName($fullOut)
if (!(Test-Path $outDir)) {
    [System.IO.Directory]::CreateDirectory($outDir) | Out-Null
}

$outStream = [System.IO.File]::Open($fullOut, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($outStream)

# ICONDIR header
$writer.Write([UInt16]0)            # idReserved
$writer.Write([UInt16]1)            # idType (1 = icon)
$writer.Write([UInt16]$sizes.Count) # idCount

# Calculate offset: header (6) + entries (16 * count)
$offset = 6 + ($sizes.Count * 16)

foreach ($entry in $imageBytesList) {
    $size = $entry[0]
    $data = $entry[1]
    
    $widthByte = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    $heightByte = if ($size -ge 256) { [byte]0 } else { [byte]$size }
    
    $writer.Write($widthByte)           # bWidth
    $writer.Write($heightByte)          # bHeight
    $writer.Write([byte]0)              # bColorCount
    $writer.Write([byte]0)              # bReserved
    $writer.Write([UInt16]1)            # wPlanes
    $writer.Write([UInt16]32)           # wBitCount
    $writer.Write([UInt32]$data.Length) # dwBytesInRes
    $writer.Write([UInt32]$offset)      # dwImageOffset
    
    $offset += $data.Length
}

# Image data
foreach ($entry in $imageBytesList) {
    $data = $entry[1]
    $writer.Write($data)
}

$writer.Flush()
$writer.Close()
$outStream.Close()

Write-Output "Successfully generated $fullOut with $($sizes.Count) resolutions."
