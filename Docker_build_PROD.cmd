@echo off

echo "build all PROD Docker images"
pause

REM version
$json = Get-Content 'package.json' | Out-String | ConvertFrom-Json
docker build --no-cache -t "ahaen/azuread-ldap-wrapper:v$($json.version)" .
docker buildx build --no-cache --push --platform linux/amd64,linux/arm64/v8,linux/arm/v7 -t "ahaen/azuread-ldap-wrapper:v$($json.version)" .

REM latest
docker build --no-cache -t ahaen/azuread-ldap-wrapper:latest .
docker buildx build --no-cache --push --platform linux/amd64,linux/arm64/v8,linux/arm/v7 -t ahaen/azuread-ldap-wrapper:latest .

pause