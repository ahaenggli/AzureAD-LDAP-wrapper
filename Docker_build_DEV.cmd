@echo off

REM dev
echo "Build DEV"
pause
docker build --no-cache -t ahaen/azuread-ldap-wrapper:dev .
pause

REM multiarch-dev
echo "Build DEV as multiarch"
pause
docker buildx build --no-cache --push --platform linux/amd64,linux/arm64/v8,linux/arm/v7 -t ahaen/azuread-ldap-wrapper:dev .
pause