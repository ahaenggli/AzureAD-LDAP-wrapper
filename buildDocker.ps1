# build all new Docker images

## dev
docker build --no-cache -t ahaen/azuread-ldap-wrapper:dev .

## version
$json = Get-Content 'package.json' | Out-String | ConvertFrom-Json
docker build --no-cache -t "ahaen/azuread-ldap-wrapper:v$($json.version)" .

## latest
docker build --no-cache -t ahaen/azuread-ldap-wrapper:latest .