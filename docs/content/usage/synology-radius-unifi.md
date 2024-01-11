---
title: 6.3 Synology Radius with UniFi
---

UniFi allows you to use a custom Radius server like the default package from Synology. Combined with the LDAP-wrapper, this creates a powerful setup for your users.

{{< hint type=tip title="This setup was successfully tested with these versions">}}
DSM 7.2.1-69057 Update 3  
LDAP-wrapper v2.0.2  
RADIUS Server Package 3.0.25-0515  
UniFi Network Application 8.0.24
{{< /hint >}}

{{< toc format=raw >}}

## Prerequisites

Before configuring Synology Radius and UniFi, ensure the following prerequisites are met:

- **Synology NAS**: Ensure you are up to date with your DSM, and install the current RADIUS Server package.
- **LDAP-wrapper**: Ensure you have a functioning [LDAP-wrapper](https://github.com/ahaenggli/AzureAD-LDAP-wrapper/).
- **UniFi AP**: Ensure you are up to date and have access to your controller settings.

## Settings in Synology RADIUS Server

1. Open the RADIUS Server package on your Synology NAS.

2. Configure the RADIUS `Common Settings` with the following parameters:

   - **Authentication port**: Set the RADIUS Server's port number for interface protocols. The default value is 1812 for authentication.
   - **Select network interface**: Choose the network interfaces connected to RADIUS client devices (e.g., a router). RADIUS Server provides authentication services only for access requests coming from the specified interface.
   - **TLS/SSL profile level**: Choose "Intermediate compatibility," which is the default setting. This option is recommended because it is compatible with general-purpose browsers but is not compatible with insecure cipher suites.
   - **Source for user authentication**: Enable LDAP users.

   ![RADIUS common settings](../radius_settings_common.png)

3. Check your certificates.

   - RADIUS Server requires a valid certificate.

   ![RADIUS certs](../radius_settings_certs.png)

4. Configure the RADIUS `Clients` by adding clients based on the IP address range.

   {{< hint type=warning title="Important Notice">}}
   Each UniFi AP will directly contact your Synology RADIUS Server. Ensure that your firewall allows all those APs to connect to your NAS with the previously defined port (e.g., 1812).
   {{< /hint >}}

   To set up clients by IP address range:

   - Click **Add** and choose **Subnet**, then enter the following information:

     - **Name**: Enter a display name for the collection of clients, making it easier to identify.
     - **IP address**: Enter the base IP addresses of the RADIUS clients (e.g., 192.168.10.1).
     - **Subnet mask**: Enter a subnet mask, for example, 255.255.255.0.
     - **Shared secret**: Enter a text string used as a password between the clients and RADIUS Server. This secret will also be needed in your UniFi configuration.

   ![RADIUS clients](../radius_settings_clients.png)

## Settings in UniFi Controller

1. Log in to your UniFi controller.
2. Navigate to **Settings > Profiles > RADIUS** and create a new entry.

    ![UniFi: Find RADIUS profiles](../radius_unifi_profiles_find.png)

    - Enable **Wired Networks**.
    - Enable **Wireless Networks**.
    - Enter the IP address of your Synology NAS in the **IP Address** field.
    - Specify the RADIUS authentication port (typically 1812) in the **Port** field.
    - Enter the same shared secret configured in the Synology RADIUS Server in the **Shared Secret** field.
    - Disable **Accounting**.

    ![UniFi: RADIUS Details](../radius_unifi_profiles_detail.png)

3. Navigate to the **Wireless Networks** section (**Settings > WiFi**) and edit your network.

    ![UniFi: Find WLAN details](../radius_unifi_wlan_new.png)

4. Edit the Wireless Network where you want to enable RADIUS authentication.
    - Enable **WPA Enterprise**.
    - Select the previously added RADIUS Profile.

    ![UniFi: WLAN Details](../radius_unifi_wlan_detail.png)

5. Save the settings and apply the changes to your UniFi network.

Now, UniFi is configured to use the Synology RADIUS Server for authentication. Users authenticated through UniFi will be verified against your LDAP directory using LDAP-wrapper, creating a robust and secure setup.
