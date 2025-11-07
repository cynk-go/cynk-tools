git add -A
if ($?) {
    $msg = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git commit -m $msg
}
if ($?) {
    git push
}