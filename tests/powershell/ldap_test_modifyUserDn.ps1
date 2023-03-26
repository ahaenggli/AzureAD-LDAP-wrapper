$ldap_server = "127.0.0.1";
$ldap_bind   = "uid=root";
$ldap_pass   = "mystrongpw";
$base        = "dc=domain,dc=tld"; 

# Install-Module -Name S.DS.P
Add-Type -AssemblyName System.DirectoryServices.Protocols;

#get password as secure string 
$pwd = ConvertTo-SecureString -String $ldap_pass  -AsPlainText -Force;
$cred = new-object PSCredential($ldap_bind, $pwd);
$Ldap = Get-LdapConnection -LdapServer $ldap_server -Credential $cred -AuthType Basic;

$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=adr*)(objectclass=*))" -SearchBase:"$($base)" -PropertiesToLoad('dn', 'Database', 'DatabasePermission');
Write-Output "before:";
Write-Output $SearchResults;

$Props = @{"distinguishedName"=$null;"dataBaSe_myId"=0;"dataBase"="notsureyet";"databasepermission"=@("UPDATE", "INSERT");};
$obj = new-object PSObject -Property $Props;
$obj.DistinguishedName = $SearchResults.distinguishedName;
$obj.Database = "mydatabas";
$obj.DatabasePermission = @("UPDATE", "INSERT");
$obj.DatabasePermission = "DELETE";
$obj.dataBaSe_myId = 1;
 
  
Write-Output "estimated:";
Write-Output $obj;

$obj | Edit-LdapObject -LdapConnection $Ldap -Mode Add;
#$obj | Edit-LdapObject -LdapConnection $Ldap -Mode Replace;

$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=adr*)(objectClass=*))" -SearchBase:"cn=users,$($base)" -PropertiesToLoad('Database', 'DatabasePermission');
Write-Output "check:";
Write-Output $SearchResults;