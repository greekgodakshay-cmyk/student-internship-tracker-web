param(
    [string]$SourcePath = "public\images\android_logo.png",
    [string]$AndroidResPath = "C:\Users\Akshay aravind .rv\OneDrive\Documents\StudentTracker-Android\app\src\main\res",
    [string]$PublicImagesPath = "public\images"
)

Add-Type -AssemblyName System.Drawing

$fullSrc = [System.IO.Path]::GetFullPath($SourcePath)
if (-not (Test-Path $fullSrc)) {
    throw "Source image not found: $fullSrc"
}

$srcImg = [System.Drawing.Image]::FromFile($fullSrc)

function Resize-Image($src, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    return $bmp
}

function Create-RoundImage($src, $size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($src, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()
    return $bmp
}

function Create-ForegroundImage($src, $canvasSize, $contentSize) {
    $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $offset = [int](($canvasSize - $contentSize) / 2)
    $g.DrawImage($src, $offset, $offset, $contentSize, $contentSize)
    $g.Dispose()
    return $bmp
}

$androidSizes = @(
    @{ Folder = "mipmap-mdpi";    Icon = 48;  FgCanvas = 108; FgContent = 72 },
    @{ Folder = "mipmap-hdpi";    Icon = 72;  FgCanvas = 162; FgContent = 108 },
    @{ Folder = "mipmap-xhdpi";   Icon = 96;  FgCanvas = 216; FgContent = 144 },
    @{ Folder = "mipmap-xxhdpi";  Icon = 144; FgCanvas = 324; FgContent = 216 },
    @{ Folder = "mipmap-xxxhdpi"; Icon = 192; FgCanvas = 432; FgContent = 288 }
)

Write-Host "Updating Android APK mipmap icons in $AndroidResPath..."

foreach ($item in $androidSizes) {
    $dir = Join-Path $AndroidResPath $item.Folder
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    # ic_launcher.png
    $iconBmp = Resize-Image $srcImg $item.Icon $item.Icon
    $iconPath = Join-Path $dir "ic_launcher.png"
    $iconBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Dispose()

    # ic_launcher_round.png
    $roundBmp = Create-RoundImage $srcImg $item.Icon
    $roundPath = Join-Path $dir "ic_launcher_round.png"
    $roundBmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $roundBmp.Dispose()

    # ic_launcher_foreground.png
    $fgBmp = Create-ForegroundImage $srcImg $item.FgCanvas $item.FgContent
    $fgPath = Join-Path $dir "ic_launcher_foreground.png"
    $fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    Write-Host "  Updated $($item.Folder) ($($item.Icon)x$($item.Icon), fg: $($item.FgCanvas)x$($item.FgCanvas))"
}

Write-Host "Updating public/images/ android-chrome icons..."
$chrome192 = Resize-Image $srcImg 192 192
$chrome192.Save((Join-Path $PublicImagesPath "android-chrome-192x192.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$chrome192.Dispose()

$chrome512 = Resize-Image $srcImg 512 512
$chrome512.Save((Join-Path $PublicImagesPath "android-chrome-512x512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$chrome512.Dispose()

$srcImg.Dispose()
Write-Host "Successfully generated all Android and web icons."
