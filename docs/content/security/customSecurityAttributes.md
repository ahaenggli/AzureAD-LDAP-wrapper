---
title: custom security attributes
---

In some scenarios, you may want to include your assigned [custom security attributes](https://learn.microsoft.com/en-us/entra/fundamentals/custom-security-attributes-overview) for each user in the LDAP-wrapper.
![entra custom security attributes](../cusSecAtt_values.png)

## Prerequisites

Before the LDAP-wrapper can retrieve custom security attributes, ensure the following prerequisites are met:

- **Microsoft Entra**:
  - Verify that you have the appropriate licenses to create and assign custom security attributes to your users.
  - Ensure custom security attributes are properly configured in Microsoft Entra.
- **LDAP-wrapper**:
  - Use version 2.0.3 or later, as earlier versions do not support this feature.

## Steps to Enable Custom Security Attributes in LDAP-wrapper

To include custom security attributes in LDAP, follow these steps:

1. Configure Application Permissions\
You need to grant specific permissions to the application registered in Azure:

    - Navigate to your registered application in the Azure portal.
    - Add the permission `CustomSecAttributeAssignment.Read.All` for the `Application` type.
    - Grant admin consent for this permission.

   ![registered app permissions](../cusSecAtt_permission.png)

2. Optionally set the environment variables `LDAP_SECURE_ATTRIBUTES` or `LDAP_SENSITIVE_ATTRIBUTES` to secure the new attribute values as described below.

3. After updating the application permissions, restart the LDAP-wrapper (or the container hosting it) to load the updated settings.

4. Verify LDAP Entries\
Once the LDAP-wrapper is running, the assigned custom security attributes will be included in your users' LDAP entries in a flattened format.

    - All attributes will have the prefix `cusSecAtt`.
    - The wrapper automatically updates or removes these attributes if changes are made in Microsoft Entra.\
    **Example of Flattened Attributes**\
    Here are example attributes based on the values in the screenshot:
    ```js
    {
      "cusSecAtt_animals_hasPermissionToFish": true,
      "cusSecAtt_animals_FavoriteAnimal": "dogs",
      "cusSecAtt_animals_fish": "Tuna",
      "cusSecAtt_animals_exampleMultiText": ["ex1","ex2"]
    }
    ```

## Security Configuration

To enhance security and limit attribute visibility, you can use the two optional environment variables:
`LDAP_SECURE_ATTRIBUTES` or `LDAP_SENSITIVE_ATTRIBUTES`.

**LDAP_SECURE_ATTRIBUTES** allows you to define attributes that are only visible to superusers. These attributes remain hidden for regular users. Example:
`LDAP_SECURE_ATTRIBUTES=cusSecAtt_*|PlannedDischargeDate`

In this example, all attributes starting with cusSecAtt_ and the PlannedDischargeDate attribute are restricted to superusers.

**LDAP_SENSITIVE_ATTRIBUTES** defines sensitive attributes that are visible only to the respective user and superusers. Regular users cannot view these attributes for other users. Example:
`LDAP_SENSITIVE_ATTRIBUTES=cusSecAtt_middlename|PrivatePhoneNumber`

Here, attributes like cusSecAtt_middlename and PrivatePhoneNumber are considered sensitive and restricted accordingly.

## Additional Tips

- Testing: To ensure everything works, verify the LDAP entries using an LDAP browser or a query tool.
- Debugging: If the attributes don’t appear, check:
        That the permissions are correctly configured and consented.
        The LDAP-wrapper logs for any errors.

For more details on custom security attributes, refer to the [official Microsoft documentation](https://learn.microsoft.com/en-us/entra/fundamentals/custom-security-attributes-overview).
