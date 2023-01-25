$Version = $env:PYTHON_VERSION
$Semver = $Version.Split('.')
if ([int]$Semver[0] -eq 3 -and [int]$Semver[1] -lt 5) {
    if ([int]$Semver[1] -gt 2) {
        $VersionNumber = $Semver[0]
        $Major = $Semver[1]
        $GetPipFile = New-TemporaryFile
        Invoke-WebRequest -Uri "https://bootstrap.pypa.io/pip/$VersionNumber.$Major/get-pip.py" -OutFile $GetPipFile
        Invoke-Expression -Command "python $GetPipFile"
        Invoke-Expression -Command "python -m pip install typing"
        if ([int]$Semver[1] -eq 4) {
            Invoke-Expression -Command "python -m pip install --upgrade wheel setuptools"
        }
    }
} else {
    Invoke-Expression -Command "python -m ensurepip"
    Invoke-Expression -Command "python -m pip install --upgrade pip"
    Invoke-Expression -Command "python -m pip install --upgrade wheel setuptools"
}