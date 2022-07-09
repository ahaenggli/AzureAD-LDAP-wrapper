$ldap_server = "127.0.0.1";
$ldap_bind   = "uid=root";
$ldap_pass   = "mystrongpw";
$base        = "dc=domain,dc=tld"; 

#Install-Module -Name S.DS.P
Add-Type -AssemblyName System.DirectoryServices.Protocols

#get password as secure string 
$pwd = ConvertTo-SecureString -String $ldap_pass  -AsPlainText -Force
$cred = new-object PSCredential($ldap_bind, $pwd)
$Ldap = Get-LdapConnection -LdapServer $ldap_server -Credential $cred -AuthType Basic

$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=*)(objectClass=*))" -SearchBase:"$($base)" -PropertiesToLoad('dn') | measure-object
Write-Output $SearchResults


$searcher = @('*');
$SearchResults = Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=a*)(objectClass=*))" -SearchBase:"cn=users,$($base)" -PropertiesToLoad *
Write-Output $SearchResults;

$SearchResults= "";


## test modify entries
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


Find-LdapObject -LdapConnection $Ldap -SearchFilter:"(&(uid=adr*)(objectClass=*))" -SearchBase:"cn=users,$($base)" -PropertiesToLoad:@('HalloWelt', 'myCustomNumber') | Perform-Modification | Edit-LdapObject -LdapConnection $Ldap -Mode Add       #-IncludedProps ['HalloWelt','myCustomNumber']


Register-LdapAttributeTransform -Name UnicodePwd
Register-LdapAttributeTransform -Name UserAccountControl

#Design the object
$Props = @{
  distinguishedName="cn=user1 ole ole ole,cn=users,$($base)"
  objectClass='user'
  sAMAccountName='User1'
  unicodePwd='S3cur3Pa$$word'
  userAccountControl='UF_NORMAL_ACCOUNT'
  }

#Create the object according to design
$obj = new-object PSObject -Property $Props

#Create the object in directory
$obj | Add-LdapObject -LdapConnection $Ldap
