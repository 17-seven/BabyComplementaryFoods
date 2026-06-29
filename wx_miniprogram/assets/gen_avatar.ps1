Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(200, 200)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'

# 圆形灰底背景
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(226, 232, 240))
$g.FillEllipse($bgBrush, 0, 0, 200, 200)

# 头像人形剪影
$fgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 174, 192))
$g.FillEllipse($fgBrush, 64, 42, 72, 72)
$g.FillEllipse($fgBrush, 40, 125, 120, 90)

$g.Dispose()
$bmp.Save("e:\AAAWork\self\BabyComplementaryFoods\wx_miniprogram\assets\avatar_default.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "avatar_default.png created"
