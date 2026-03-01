from ldap3 import Server, Connection, ALL, SUBTREE

LDAP_URI = "ldap://127.0.0.1:13389"
BIND_DN = "uid=root,cn=users,dc=domain,dc=tld"
PASSWORD = "mystrongpw"
BASE_DN = "dc=domain,dc=tld"

# 1 Server mit Schema laden
server = Server(LDAP_URI, get_info=ALL)

conn = Connection(
    server,
    user=BIND_DN,
    password=PASSWORD,
    auto_bind=True
)

# Schema-Informationen für uid inspizieren
uid_schema = server.schema.attribute_types.get("department")  # Ersetzen Sie "uid" durch den tatsächlichen Attributnamen, den Sie untersuchen möchten

if uid_schema:
    print("=== UID Schema Info ===")
    print("OID:", uid_schema.oid)
    print("Syntax OID:", uid_schema.syntax)
    print("Single Value:", uid_schema.single_value)
    print("Equality rule:", uid_schema.equality)
    print("Substring rule:", uid_schema.substring)
    print()
else:
    print("uid not found in schema")

# 3 Query nach spezifischem uid
uid_value = "testuser"

conn.search(
    search_base=BASE_DN,
    search_filter=f"(departmentNumber={uid_value})",
    search_scope=SUBTREE,
    attributes=["departmentNumber", "uid", "cn", "sn", "mail"]
)

print("=== Search Results ===")
for entry in conn.entries:
    print("DN:", entry.entry_dn)
    print("uid:", entry.uid.value)
    print("cn:", entry.cn.value)
    print("sn:", entry.sn.value)
    print("mail:", entry.mail.value)
    print("departmentNumber:", entry.departmentNumber.value)
    print("-" * 40)

conn.unbind()