$ldap_server = "127.0.0.1";
$ldap_bind   = "uid=root,cn=users,dc=domain,dc=tld";
$ldap_pass   = "abc123";

#Install-Module -Name S.DS.P
Add-Type -AssemblyName System.DirectoryServices.Protocols

#get password as secure string 
$pwd = ConvertTo-SecureString -String $ldap_pass  -AsPlainText -Force
$cred = new-object PSCredential($ldap_bind, $pwd)
$Ldap = Get-LdapConnection -LdapServer $ldap_server -Credential $cred -AuthType Basic


$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=*)(objectClass=*))" -SearchBase:"dc=domain,dc=tld" -PropertiesToLoad('dn') | measure-object
Write-Output $SearchResults

exit;


$searcher = @('*');
$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=a*)(objectClass=*))" -SearchBase:"cn=users,dc=domain,dc=tld" -PropertiesToLoad *
Write-Output $SearchResults;

$SearchResults= "";

# (Get-RootDse -LdapConnection $Ldap).CurrentTime - [DateTime]::Now
# exit;

# Remove-LdapObject  -LdapConnection $Ldap -Object "cn=user1 ole ole ole,cn=users,dc=mydomain,dc=com"

Function Perform-Modification
{
  Param
  (
    [Parameter(Mandatory,ValueFromPipeline)]
    $LdapObject
  )
  Process
  {
    
    #$LdapObject.shadowExpire = $null
    $LdapObject.HalloWelt = "n"
    $LdapObject.myCustomNumber=1234  
    
    $LdapObject
    
  }
}

#gets RootDSE object
#disable many user accounts
## Write-Output $Dse
## exit;

Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=root)(objectClass=*))" -SearchBase:"cn=users,dc=domain,dc=tld" -PropertiesToLoad:@('HalloWelt', 'myCustomNumber') | Perform-Modification | Edit-LdapObject -LdapConnection $Ldap -Mode Add       #-IncludedProps ['HalloWelt','myCustomNumber']


exit;
Register-LdapAttributeTransform -Name UnicodePwd
Register-LdapAttributeTransform -Name UserAccountControl

#Design the object
$Props = @{
  distinguishedName='cn=user1 ole ole ole,cn=users,dc=mydomain,dc=com'
  objectClass='user'
  sAMAccountName='User1'
  unicodePwd='S3cur3Pa$$word'
  userAccountControl='UF_NORMAL_ACCOUNT'
  }

#Create the object according to design
$obj = new-object PSObject -Property $Props

#When dealing with password, LDAP server is likely
#to require encrypted connection

#Create the object in directory
$obj | Add-LdapObject -LdapConnection $Ldap
exit;