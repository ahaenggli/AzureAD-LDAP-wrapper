@echo off

REM multiarch-dev
echo "Build DEV as multiarch"
pause
REM podman build --no-cache -t docker.io/ahaen/azuread-ldap-wrapper:latest .

podman run --rm --privileged docker.io/multiarch/qemu-user-static --reset -p yes
podman manifest create docker.io/ahaen/azuread-ldap-wrapper:dev
podman build --no-cache --platform linux/amd64,linux/arm64 --manifest docker.io/ahaen/azuread-ldap-wrapper:dev .
podman manifest push docker.io/ahaen/azuread-ldap-wrapper:dev

pause