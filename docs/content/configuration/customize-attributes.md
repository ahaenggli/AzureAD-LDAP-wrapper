---
title: Customize attributes
---

It is possible to customize all the ldap attributes. That's what I do in the DSM 7 workaround.
Look at [this](https://github.com/ahaenggli/AzureAD-LDAP-wrapper/blob/main/customizer/customizer_DSM7_IDs_string2int.js) file for an example. Customize it as you need and map the file in your docker setup as `/app/customizer/ldap_customizer.js`. This file has even priority over the DSM 7 workaround. Basically everything can be changed with it. Filter users or groups, overwrite a users default group, add/remove/edit entries or attributes, and much more.
