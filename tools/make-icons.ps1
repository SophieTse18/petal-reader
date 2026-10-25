# Draws the Petal Reader icon (dark tile with pastel sound-wave bars) in every size we need.
# Run with:  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
param([string]$OutDir = (Join-Path (Split-Path $PSScriptRoot -Parent) 'assets'))

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Add-RoundRect($path, [single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $d = 2 * $r
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
}

function New-PetalIcon([int]$size, [bool]$fullBleed) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $s = $size / 64.0

  $bg = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($fullBleed) { $bg.AddRectangle((New-Object System.Drawing.RectangleF 0, 0, $size, $size)) }
  else { Add-RoundRect $bg 0 0 $size $size (16 * $s) }
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#1e1a33'))), $bg)

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.PointF 0, 0), (New-Object System.Drawing.PointF $size, $size), ([System.Drawing.Color]::White), ([System.Drawing.Color]::White)
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend 3
  $blend.Colors = @([System.Drawing.ColorTranslator]::FromHtml('#ffb1d6'), [System.Drawing.ColorTranslator]::FromHtml('#cbbcff'), [System.Drawing.ColorTranslator]::FromHtml('#a8dcff'))
  $blend.Positions = @([single]0, [single]0.5, [single]1)
  $brush.InterpolationColors = $blend

  # Maskable icons keep the artwork inside the central safe zone.
  $k = if ($fullBleed) { 0.72 } else { 1.0 }
  $bars = @(@(10, 25, 6, 14), @(19.5, 18, 6, 28), @(29, 12, 6, 40), @(38.5, 18, 6, 28), @(48, 25, 6, 14))
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  foreach ($b in $bars) {
    $x = (32 + ($b[0] - 32) * $k) * $s; $y = (32 + ($b[1] - 32) * $k) * $s
    $w = $b[2] * $k * $s; $h = $b[3] * $k * $s
    Add-RoundRect $p $x $y $w $h ($w / 2)
  }
  $g.FillPath($brush, $p)
  $g.Dispose()
  return $bmp
}

function Save-Png($bmp, $file) { $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose() }

Save-Png (New-PetalIcon 128 $false) (Join-Path $OutDir 'icon-128.png')
Save-Png (New-PetalIcon 180 $true)  (Join-Path $OutDir 'apple-touch-icon.png')
Save-Png (New-PetalIcon 192 $false) (Join-Path $OutDir 'icon-192.png')
Save-Png (New-PetalIcon 512 $false) (Join-Path $OutDir 'icon-512.png')
Save-Png (New-PetalIcon 512 $true)  (Join-Path $OutDir 'icon-maskable-512.png')

# Windows .ico with PNG frames (Vista and later understand these).
$sizes = 16, 24, 32, 48, 64, 128, 256
$frames = foreach ($sz in $sizes) {
  $ms = New-Object System.IO.MemoryStream
  $bmp = New-PetalIcon $sz $false
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  , $ms.ToArray()
}
$ico = Join-Path $OutDir 'petal.ico'
$fs = [System.IO.File]::Create($ico)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $dim = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
  $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32)
  $bw.Write([UInt32]$frames[$i].Length); $bw.Write([UInt32]$offset)
  $offset += $frames[$i].Length
}
foreach ($f in $frames) { $bw.Write($f) }
$bw.Close()
Write-Host "Icons written to $OutDir"
