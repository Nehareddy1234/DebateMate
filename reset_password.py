#!/usr/bin/env python3
"""CLI utility to reset user passwords in DebateMate.

Usage:
    python reset_password.py <username_or_email> <new_password>
"""

import asyncio
import sys

from auth import hash_password
from storage import store


async def _resolve_user(ident: str) -> tuple[str, dict] | None:
    key = ident.strip().lower()
    user = await store.get(f"users/{key}.json")
    if user:
        return key, user
    index = await store.get(f"user_index/email/{key}.json")
    if index:
        username = index.get("username", "").lower()
        user = await store.get(f"users/{username}.json")
        if user:
            return username, user
    return None


async def main():
    if len(sys.argv) < 3:
        print("Usage: python reset_password.py <username_or_email> <new_password>")
        sys.exit(1)

    ident = sys.argv[1].strip()
    new_password = sys.argv[2]

    if len(new_password) < 8:
        print("Error: Password must be at least 8 characters long.")
        sys.exit(1)

    resolved = await _resolve_user(ident)
    if not resolved:
        print(f"Error: User '{ident}' not found in storage.")
        sys.exit(1)

    username_key, user = resolved
    user["password_hash"] = hash_password(new_password)
    await store.put(f"users/{username_key}.json", user)

    print(f"Success! Password for user '{user.get('username')}' ({user.get('email')}) updated successfully.")


if __name__ == "__main__":
    asyncio.run(main())
