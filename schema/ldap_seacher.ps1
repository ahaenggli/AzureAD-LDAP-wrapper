$ldap_server = "127.0.0.1";
$ldap_bind   = "uid=root,cn=users,dc=han,dc=net";
$ldap_pass   = "abc123";

Install-Module -Name S.DS.P
Add-Type -AssemblyName System.DirectoryServices.Protocols

#get password as secure string 
$pwd = ConvertTo-SecureString -String $ldap_pass  -AsPlainText -Force
$cred = new-object PSCredential($ldap_bind, $pwd)
$Ldap = Get-LdapConnection -LdapServer $ldap_server -Credential $cred -AuthType Basic

$searcher = @('*');
$SearchResults= "";

#$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(objectclass=*)" -SearchBase:"cn=subschema" -PropertiesToLoad 'objectclasses'
$searcher = "objectClasses";
$SearchResults = Find-LdapObject -LdapConnection $Ldap  -SearchBase "cn=subschema" -searchScope Base -SearchFilter '(objectclass=*)' -PropertiesToLoad $searcher | Select-Object -ExpandProperty $searcher
$SearchResults  | Out-File -FilePath ($PSScriptRoot + ".\"+$searcher+".csv")
$SearchResults= "";

$searcher = "attributeTypes";
$SearchResults = Find-LdapObject -LdapConnection $Ldap  -SearchBase "cn=subschema" -searchScope Base -SearchFilter '(objectclass=*)' -PropertiesToLoad $searcher | Select-Object -ExpandProperty $searcher
$SearchResults  | Out-File -FilePath ($PSScriptRoot + ".\"+$searcher+".csv")
$SearchResults= "";

$searcher = "matchingRuleUse";
$SearchResults = Find-LdapObject -LdapConnection $Ldap  -SearchBase "cn=subschema" -searchScope Base -SearchFilter '(objectclass=*)' -PropertiesToLoad $searcher | Select-Object -ExpandProperty $searcher
$SearchResults  | Out-File -FilePath ($PSScriptRoot + ".\"+$searcher+".csv")
$SearchResults= "";

$searcher = "matchingRules";
$SearchResults = Find-LdapObject -LdapConnection $Ldap  -SearchBase "cn=subschema" -searchScope Base -SearchFilter '(objectclass=*)' -PropertiesToLoad $searcher | Select-Object -ExpandProperty $searcher
$SearchResults  | Out-File -FilePath ($PSScriptRoot + ".\"+$searcher+".csv")
$SearchResults= "";

$searcher = "ldapSyntaxes";
$SearchResults = Find-LdapObject -LdapConnection $Ldap  -SearchBase "cn=subschema" -searchScope Base -SearchFilter '(objectclass=*)' -PropertiesToLoad $searcher | Select-Object -ExpandProperty $searcher
$SearchResults  | Out-File -FilePath ($PSScriptRoot + ".\"+$searcher+"2.csv")
$SearchResults= "";