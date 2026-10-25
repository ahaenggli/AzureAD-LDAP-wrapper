@echo off

echo "build all PROD Docker images"
pause

REM version
$json = Get-Content 'package.json' | Out-String | ConvertFrom-Json

podman run --rm --privileged docker.io/multiarch/qemu-user-static --reset -p yes
podman manifest create "docker.io/ahaen/azuread-ldap-wrapper:v$($json.version)"
podman build --no-cache --platform linux/amd64,linux/arm64 --manifest "docker.io/ahaen/azuread-ldap-wrapper:v$($json.version)" .
podman manifest push "docker.io/ahaen/azuread-ldap-wrapper:v$($json.version)"

echo "build latest"
pause

REM latest
podman manifest create "docker.io/ahaen/azuread-ldap-wrapper:latest"
podman build --no-cache --platform linux/amd64,linux/arm64 --manifest "docker.io/ahaen/azuread-ldap-wrapper:latest" .
podman manifest push "docker.io/ahaen/azuread-ldap-wrapper:latest"

pause