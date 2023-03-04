---
title: 1.1 Create an AzureAD application 
---

{{< toc format=raw >}}

## Prerequisites

To register an application in your Azure AD tenant, you need:

- An Azure AD user account. If you don't already have one, you can [create an account for free](https://azure.microsoft.com/free/).

## Register an application with Azure AD and create a service principal

Register a new application in your [aad-portal](https://aad.portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps). More descriptions can be found [here](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal).

- Sign-in to the Azure portal.
- Select Azure Active Directory and navigateo to [App registrations](https://aad.portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps).
- Select New registration.
- Name the application, for example "ldap-wrapper".
- Select a supported account type, which determines who can use the application.\
  Important: Personal Microsoft accounts are not supported.
- Under Redirect URI, select nothing and keep it empty.
- Select Register.\
  ![aad register](../aad_register.png)

## Set permissions

- Set the following Graph-API Application permissions:  
  For type `Application`  allow `User.Read.All` and `Group.Read.All`.\
  For type `Delegated` allow `User.Read`.\
  ![Azure Permissions](../azure_permissions.png)

- Set [Treat application as a public client](https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/wiki/Username-Password-Authentication#application-registration) to `Yes`  
(former "Allow public client flows")![Azure ROPC](../azure_ROPC.png)

## Get TenantId, AppId and AppSecret

Copy and save those values for the later use as environment variables in the Docker container:

- `AZURE_TENANTID`: Directory (tenant) ID from the page "overview".
- `AZURE_APP_ID`: Application (client) ID from the page "overview".
  ![aad tenant](../aad_tenant.png)
- `AZURE_APP_SECRET`: Value of a new client secret from the page "Certificates & secrets".  
  ![aad app secret](../aad_appsecret.png)

## Use TenantId, AppId and AppSecret in your wrapper

Use a docker container or any other method to run the LDAP-wrapper and start it with the previously saved environment variables.
