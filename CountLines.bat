@echo off
powershell -NoProfile -Command ^
"$files = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx -File ^| Where-Object { $_.FullName -notmatch '\\dist\\' -and $_.FullName -notmatch '\\.ignore\\' -and $_.FullName -notmatch '\\node_modules\\' }; ^
$table = @(); ^
$totalLines = 0; ^
$totalFiles = $files.Count; ^
$counter = 0; ^
foreach ($file in $files) { ^
    $counter++; ^
    $percent = [math]::Round(($counter / $totalFiles) * 100); ^
    Write-Progress -Activity 'Counting lines' -Status ('Processing {0} of {1} files' -f $counter, $totalFiles) -PercentComplete $percent; ^
    $lineCount = (Get-Content $file.FullName -ErrorAction SilentlyContinue).Count; ^
    $table += [PSCustomObject]@{ File = $file.FullName.Substring((Get-Location).Path.Length); Lines = $lineCount }; ^
    $totalLines += $lineCount; ^
}; ^
$table = $table ^| Sort-Object Lines -Descending; ^
Write-Host ''; ^
Write-Host ('{0,-80} {1,10}' -f 'File', 'Lines') -ForegroundColor Cyan; ^
Write-Host ('{0,-80} {1,10}' -f '----', '-----') -ForegroundColor Cyan; ^
$index = 0; ^
foreach ($row in $table) { ^
    $index++; ^
    if ($index -le 10) { $color='Red' } ^
    elseif ($index -le 20) { $color='Yellow' } ^
    else { $color='White' } ^
    Write-Host ('{0,-80} {1,10}' -f $row.File, $row.Lines) -ForegroundColor $color; ^
}; ^
Write-Host ''; ^
Write-Host ('TOTAL LINES: {0:N0}' -f $totalLines) -ForegroundColor Cyan;"
pause
