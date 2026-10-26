Add-Type -AssemblyName System.Drawing
$source = 'C:\Users\TEST\Downloads\Gemini_Generated_Image_jueceejueceejuec.jpg'
$img = [System.Drawing.Image]::FromFile($source)

$folders = @{
    'mipmap-mdpi' = 48
    'mipmap-hdpi' = 72
    'mipmap-xhdpi' = 96
    'mipmap-xxhdpi' = 144
    'mipmap-xxxhdpi' = 192
}

foreach ($folderName in $folders.Keys) {
    $size = $folders[$folderName]
    $dirPath = "C:\Users\TEST\StudioProjects\untitled\android\app\src\main\res\$folderName"

    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($img, 0, 0, $size, $size)
    $graphics.Dispose()

    $p1 = Join-Path $dirPath 'ic_launcher.png'
    $p2 = Join-Path $dirPath 'ic_launcher_round.png'

    $bmp.Save($p1, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($p2, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Generated $folderName ($size x $size) from new ship cashier icon image"
}

$img.Dispose()
