---
title: 1.1 Register an application with the Microsoft identity platform
---

{{< toc format=raw >}}

## Prerequisites

To register an application with the Microsoft identity platform, you need:

- A Microsoft Entra ID user account. If you don't already have one, you can [create an account for free](https://azure.microsoft.com/free/).

## Register an application with the Microsoft identity platform

Register a new application in your [Microsoft Entra Admin Center](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade/quickStartType~/null/sourceType/Microsoft_AAD_IAM). More descriptions can be found [here](https://learn.microsoft.com/en-us/entra/identity-platform/howto-create-service-principal-portal).

- Sign-in to the Microsoft Entra Admin Center.
- Browse to Identity > Applications > [App registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade/quickStartType~/null/sourceType/Microsoft_AAD_IAM)
- Select New registration.
- Name the application, for example "ldap-wrapper".
- Select a supported account type, which determines who can use the application.\
  Important: Personal Microsoft accounts are not supported.
- Under Redirect URI, select nothing and keep it empty.
- Select Register.\
  ![aad register](../aad_register.png)

## Set permissions

- Set the following Microsoft Graph API Application permissions:  
  For type `Application` allow `User.Read.All`, `Group.Read.All`.\
  For type `Delegated` allow `User.Read`.\
  Optionally: Allow `Device.Read.All` for type `Application` if you also want to load devices.\
  ![Entra Permissions](../entra_permissions.png)

- Click "Grant admin consent". The status should be "Granted for".\
  If you see en entry with "Not granted for", click again:
  ![Entra wrong permissions](../entra_permissions_notgranted.png)

- Set [Allow public client flows](https://learn.microsoft.com/de-de/entra/msal/dotnet/acquiring-tokens/desktop-mobile/username-password-authentication#application-registration) to `Yes`  
![Entra ROPC](../entra_ROPC.png)

## Get TenantId, AppId and AppSecret

Copy and save those values for the later use as environment variables in the Docker container:

- `AZURE_TENANTID`: Directory (tenant) ID from the page "overview".
- `AZURE_APP_ID`: Application (client) ID from the page "overview".
  ![aad tenant](../aad_tenant.png)
- `AZURE_APP_SECRET`: Value of a new client secret from the page "Certificates & secrets".  
  ![aad app secret](../aad_appsecret.png)

## Use TenantId, AppId and AppSecret in your wrapper

Use a docker container or any other method to run the LDAP-wrapper and start it with the previously saved environment variables.
