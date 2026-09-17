"""Auth + transcript endpoint integration tests (object store)."""

VALID_SAVE = {
    "session_id": "sess-123",
    "topic": "AI is a net positive",
    "user_side": "Pro",
    "started_at": "2026-08-30T10:00:00",
    "transcript": [
        {"speaker": "user", "text": "AI creates jobs.",
         "timestamp": "2026-08-30T10:00:10"},
        {"speaker": "ai", "text": "But at what cost?",
         "timestamp": "2026-08-30T10:00:20"},
    ],
}


async def test_register_login_me(client):
    r = await client.post("/auth/register", json={
        "username": "alice", "email": "alice@example.com",
        "password": "Str0ngPass!"})
    assert r.status_code == 201
    token = r.json()["access_token"]
    assert r.json()["user"]["username"] == "alice"

    r = await client.post("/auth/login", json={
        "username": "alice", "password": "Str0ngPass!"})
    assert r.status_code == 200

    r = await client.get("/auth/me", headers={
        "Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


async def test_register_duplicate_rejected(client):
    body = {"username": "bob", "email": "bob@example.com",
            "password": "Str0ngPass!"}
    assert (await client.post("/auth/register", json=body)).status_code == 201
    r = await client.post("/auth/register", json=body)
    assert r.status_code == 409


async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "username": "carol", "email": "carol@example.com",
        "password": "Str0ngPass!"})
    r = await client.post("/auth/login", json={
        "username": "carol", "password": "wrong-password"})
    assert r.status_code == 401


async def test_me_requires_auth(client):
    assert (await client.get("/auth/me")).status_code in (401, 403)


async def test_transcript_crud_and_ownership(client, auth_headers):
    r = await client.post("/transcripts", json=VALID_SAVE, headers=auth_headers)
    assert r.status_code == 201
    tid = r.json()["id"]

    r = await client.get("/transcripts", headers=auth_headers)
    assert r.status_code == 200
    listing = r.json()["transcripts"]
    assert len(listing) == 1
    assert listing[0]["topic"] == VALID_SAVE["topic"]
    assert "transcript" not in listing[0]   # list view stays light

    r = await client.get(f"/transcripts/{tid}", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()["transcript"]) == 2

    # A different user cannot read it
    r = await client.post("/auth/register", json={
        "username": "mallory", "email": "mallory@example.com",
        "password": "Str0ngPass!"})
    other = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert (await client.get(f"/transcripts/{tid}",
                             headers=other)).status_code == 404


async def test_transcript_requires_auth(client):
    assert (await client.post("/transcripts",
                              json=VALID_SAVE)).status_code in (401, 403)


async def test_save_transcript_rejects_path_traversal(client, auth_headers):
    bad = dict(VALID_SAVE, session_id="../etc/passwd")
    r = await client.post("/transcripts", json=bad, headers=auth_headers)
    assert r.status_code == 422


async def test_healthz(client):
    r = await client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_register_rate_limited(client):
    from voice_server import app

    app.state.limiter.enabled = True
    try:
        codes = []
        for i in range(6):
            r = await client.post("/auth/register", json={
                "username": f"rate{i}",
                "email": f"rate{i}@example.com",
                "password": "Str0ngPass!",
            })
            codes.append(r.status_code)
        assert codes[:5] == [201] * 5
        assert codes[5] == 429
    finally:
        app.state.limiter.enabled = False
        app.state.limiter.reset()


async def test_reset_password_success(client):
    await client.post("/auth/register", json={
        "username": "david", "email": "david@example.com",
        "password": "InitialPass123!"})

    r = await client.post("/auth/reset-password", json={
        "username": "david",
        "email": "david@example.com",
        "new_password": "NewSecretPass456!",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    # Can now login with new password
    r = await client.post("/auth/login", json={
        "username": "david", "password": "NewSecretPass456!"})
    assert r.status_code == 200

    # Old password no longer works
    r = await client.post("/auth/login", json={
        "username": "david", "password": "InitialPass123!"})
    assert r.status_code == 401


async def test_reset_password_mismatched_email_or_user(client):
    await client.post("/auth/register", json={
        "username": "emma", "email": "emma@example.com",
        "password": "InitialPass123!"})

    # Wrong email
    r = await client.post("/auth/reset-password", json={
        "username": "emma",
        "email": "wrong@example.com",
        "new_password": "NewSecretPass456!",
    })
    assert r.status_code == 404

    # Nonexistent user
    r = await client.post("/auth/reset-password", json={
        "username": "nonexistent",
        "email": "emma@example.com",
        "new_password": "NewSecretPass456!",
    })
    assert r.status_code == 404


async def test_change_password_flow(client):
    r = await client.post("/auth/register", json={
        "username": "frank", "email": "frank@example.com",
        "password": "OldPassword123!"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Incorrect old password
    r = await client.post("/auth/change-password", headers=headers, json={
        "old_password": "WrongOldPassword",
        "new_password": "BrandNewPass999!",
    })
    assert r.status_code == 400

    # Correct old password
    r = await client.post("/auth/change-password", headers=headers, json={
        "old_password": "OldPassword123!",
        "new_password": "BrandNewPass999!",
    })
    assert r.status_code == 200

    # Can login with new password
    r = await client.post("/auth/login", json={
        "username": "frank", "password": "BrandNewPass999!"})
    assert r.status_code == 200

