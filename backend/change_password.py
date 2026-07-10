import getpass
import contextlib
import database
import auth

def main():
    database.init_db()
    print("Change password for an existing account.\n")
    username = input("Username: ").strip()

    with contextlib.closing(database.get_connection()) as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()

        if user is None:
            print(f"No account found with username '{username}'.")
            return
        
        new_password = getpass.getpass("New password: ")
        confirm = getpass.getpass("Confirm new password: ")

        if new_password != confirm:
            print("passwords didn't match.")
            return
        if len(new_password) < 8:
            print("Use at least 8 characters.")
            return
        
        new_hash = auth.hash_password(new_password)
        conn.execute(
            "UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
            (new_hash, user["id"]),

        )
        conn.commit()
        database.log_action(user["id"], "password_changed")
        print("\nPassword updated.")

if __name__ == "__main__":
    main()