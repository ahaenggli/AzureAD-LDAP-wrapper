$ldap_server = "127.0.0.1";
$ldap_bind   = "uid=root";
$ldap_pass   = "mystrongpw";
$base        = "dc=domain,dc=tld"; 

#Install-Module -Name S.DS.P
Add-Type -AssemblyName System.DirectoryServices.Protocols

#get password as secure string 
#$pwd = ConvertTo-SecureString -String $ldap_pass  -AsPlainText -Force;
#$cred = new-object PSCredential($ldap_bind, $pwd);
#$Ldap = Get-LdapConnection -LdapServer $ldap_server -Credential $cred -AuthType Basic;
$Ldap = Get-LdapConnection -LdapServer $ldap_server -AuthType Anonymous

$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=adr*)(objectClass=*))" -SearchBase:"$($base)" -PropertiesToLoad('dn')
Write-Output $SearchResults
