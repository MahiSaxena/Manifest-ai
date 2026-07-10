import database
import contextlib

database.init_db()
with contextlib.closing(database.get_connection()) as conn:
    users = conn.execute(
        "SELECT id, username, is_admin, created_at FROM users ORDER BY id"
    ).fetchall()
    
    print(f"\n{'ID':<5} {'Username':<20} {'Role':<10} {'Created'}")
    print("-" * 55)
    for u in users:
        role = "Admin" if u['is_admin'] else "User"
        print(f"{u['id']:<5} {u['username']:<20} {role:<10} {u['created_at'][:10]}")
    print(f"\nTotal: {len(users)} users")