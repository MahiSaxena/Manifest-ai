import getpass
import database
import auth

def main():
    database.init_db()
    print("Create a new user account.\n")
    
    username = input("Username: ").strip()
    if not username:
        print("Username cannot be empty.")
        return

    # Check if username already exists
    import contextlib
    with contextlib.closing(database.get_connection()) as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if existing:
            print(f"Username '{username}' already exists.")
            return

    is_admin_input = input("Make this user an admin? (y/n): ").strip().lower()
    is_admin = is_admin_input == "y"

    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")

    if password != confirm:
        print("Passwords didn't match.")
        return

    if len(password) < 8:
        print("Use at least 8 characters.")
        return

    try:
        user_id = auth.create_user(username, password, is_admin=is_admin)
        role = "admin" if is_admin else "user"
        print(f"\n✓ Account '{username}' created as {role} (id={user_id}).")
    except Exception as e:
        print(f"\nCouldn't create account: {e}")

if __name__ == "__main__":
    main()