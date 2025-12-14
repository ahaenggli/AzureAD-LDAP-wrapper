@echo off

echo "build all PROD Docker images"
pause

REM version
$json = Get-Content 'package.json' | Out-String | ConvertFrom-Json
docker build --no-cache -t "ahaen/azuread-ldap-wrapper:v$($json.version)" .
docker buildx build --no-cache --push -t "ahaen/azuread-ldap-wrapper:v$($json.version)" --platform linux/arm64,linux/amd64,linux/arm/v8,linux/arm/v7,linux/arm/v6 .

echo "build latest"
pause

REM latest
docker build --no-cache -t ahaen/azuread-ldap-wrapper:latest .
docker buildx build --no-cache --push -t "ahaen/azuread-ldap-wrapper:latest" --platform linux/arm64,linux/amd64,linux/arm/v8,linux/arm/v7,linux/arm/v6 .
pause