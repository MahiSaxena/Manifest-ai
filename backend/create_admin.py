import getpass
import database
import auth

def main():
    database.init_db()
    print("Create the first admin account. \n")
    username = input("Username: ").strip()
    if not username:
        print("Username cannot be empty.")
        return
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords didn't match.")
        return
    if len(password) < 8:
        print("Use at least 8 characters.")
        return
    try:
        user_id = auth.create_user(username, password, is_admin=True)
        print(f"\nAdmin account '{username}' created (id={user_id}).")
    except Exception as e:
        print(f"\nCouldn't create account: {e}")

if __name__ == "__main__":
    main()