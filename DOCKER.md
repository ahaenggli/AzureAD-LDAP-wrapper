# Docker

## run image

1. touch .env
2. set your environment variables
3. run

```bash
docker run -d -p 389:13389 --volume /home/mydata:/app/.cache --env-file .env ahaen/azuread-ldap-wrapper
```

## build image

run

```bash
docker build -t ahaen/azuread-ldap-wrapper .
```
