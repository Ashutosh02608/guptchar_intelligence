"""
CLI Utility to create and manage operators in the Neon PostgreSQL users table.

Usage:
    python backend/create_user.py --username <username> --email <email> --password <password> [--role ADMIN]
    
    Or run interactively:
    python backend/create_user.py
"""

import sys
import os
import asyncio
import argparse
import getpass

# Ensure parent directory is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from backend.auth_service import hash_password
from backend.database import init_db, create_user, get_user_by_identity, list_users
from backend.postgres import close_pool as close_pg_pool


async def main_async(args):
    print("=" * 60)
    print("  GUPTCHAR - NEON POSTGRESQL USER PROVISIONING")
    print("=" * 60)

    # Initialize tables if not already present
    await init_db()

    username = args.username
    email = args.email
    password = args.password
    role = args.role or "ADMIN"

    # Interactive prompt if credentials were not provided via CLI flags
    if not username:
        username = input("Enter Username: ").strip()
    if not email:
        email = input("Enter Email Address: ").strip()
    if not password:
        password = getpass.getpass("Enter Secure Password: ").strip()
        confirm = getpass.getpass("Confirm Secure Password: ").strip()
        if password != confirm:
            print("[-] Error: Passwords do not match. Aborting.")
            await close_pg_pool()
            sys.exit(1)

    if not username or not email or not password:
        print("[-] Error: Username, Email, and Password are all required.")
        await close_pg_pool()
        sys.exit(1)

    # Check if user with same username or email already exists
    existing = await get_user_by_identity(username)
    if not existing:
        existing = await get_user_by_identity(email)

    if existing:
        print(f"[-] A user with username '{existing['username']}' or email '{existing['email']}' already exists (ID: {existing['id']}).")
        await close_pg_pool()
        sys.exit(1)

    # Hash password using PBKDF2 with unique salt
    pwd_hash = hash_password(password)

    # Insert into Neon DB
    user = await create_user(
        username=username,
        email=email,
        password_hash=pwd_hash,
        role=role
    )

    print(f"[+] Successfully created user in Neon PostgreSQL!")
    print(f"    - ID:       {user['id']}")
    print(f"    - Username: {user['username']}")
    print(f"    - Email:    {user['email']}")
    print(f"    - Role:     {user['role']}")
    print("=" * 60)

    await close_pg_pool()


def main():
    parser = argparse.ArgumentParser(description="Create a user in Neon PostgreSQL for Guptchar.")
    parser.add_argument("--username", "-u", help="Username for login", default=None)
    parser.add_argument("--email", "-e", help="Email address", default=None)
    parser.add_argument("--password", "-p", help="Password for login", default=None)
    parser.add_argument("--role", "-r", help="Role (default: ADMIN)", default="ADMIN")
    parser.add_argument("--list", "-l", action="store_true", help="List all registered users")
    parser.add_argument("--delete", "-d", help="Delete user by username or email", default=None)

    parsed = parser.parse_args()

    if parsed.list:
        async def do_list():
            await init_db()
            users = await list_users()
            print("=" * 60)
            print(f"  REGISTERED USERS ({len(users)})")
            print("=" * 60)
            for u in users:
                print(f"  [{u['id']}] {u['username']} <{u['email']}> | Role: {u['role']}")
            print("=" * 60)
            await close_pg_pool()
        asyncio.run(do_list())
    elif parsed.delete:
        async def do_delete():
            await init_db()
            from backend.database import get_user_by_identity, delete_user
            target = await get_user_by_identity(parsed.delete)
            if not target:
                print(f"[-] No user found matching '{parsed.delete}'.")
            else:
                ok = await delete_user(target["id"])
                if ok:
                    print(f"[+] Successfully deleted user '{target['username']}' ({target['id']}).")
                else:
                    print(f"[-] Failed to delete user '{target['username']}'.")
            await close_pg_pool()
        asyncio.run(do_delete())
    else:
        asyncio.run(main_async(parsed))


if __name__ == "__main__":
    main()
