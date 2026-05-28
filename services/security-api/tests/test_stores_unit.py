"""
Unit tests for the in-memory store implementations and their singleton helpers.

All tests operate without a real MongoDB:
  - InMemory* classes are instantiated directly.
  - Singleton helpers (_build_store / get_*_store) are tested by resetting the
    module-level global and making MongoClient unavailable so the fallback path
    (InMemory*) is always taken.
"""

import pytest

# ── InMemoryIncidentStore ─────────────────────────────────────────────────────


def test_in_memory_incident_store_save_and_list():
    from app.core.incident_store import InMemoryIncidentStore

    store = InMemoryIncidentStore()
    store.save_incident({"id": "a", "action": "BLOCK"})
    store.save_incident({"id": "b", "action": "ALLOW"})

    # most-recent-first insertion order (insert(0, ...))
    items = store.list_incidents(limit=10)
    assert len(items) == 2
    assert items[0]["id"] == "b"
    assert items[1]["id"] == "a"


def test_in_memory_incident_store_list_with_offset():
    from app.core.incident_store import InMemoryIncidentStore

    store = InMemoryIncidentStore()
    for i in range(5):
        store.save_incident({"id": str(i)})

    page = store.list_incidents(limit=2, offset=1)
    assert len(page) == 2


def test_in_memory_incident_store_list_zero_limit():
    from app.core.incident_store import InMemoryIncidentStore

    store = InMemoryIncidentStore()
    store.save_incident({"id": "x"})

    assert store.list_incidents(limit=0) == []


def test_in_memory_incident_store_strips_vector_source_text():
    """vectorSourceText must be removed from the stored document."""
    from app.core.incident_store import InMemoryIncidentStore

    store = InMemoryIncidentStore()
    store.save_incident({"id": "v", "vectorSourceText": "raw prompt"})

    stored = store.list_incidents(limit=1)[0]
    assert "vectorSourceText" not in stored
    assert stored["id"] == "v"


def test_in_memory_incident_store_is_thread_safe():
    """Smoke test: concurrent saves do not raise."""
    import threading

    from app.core.incident_store import InMemoryIncidentStore

    store = InMemoryIncidentStore()
    errors = []

    def worker(n):
        try:
            for i in range(20):
                store.save_incident({"worker": n, "i": i})
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(t,)) for t in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == []
    assert len(store.list_incidents(limit=200)) == 100


# ── incident_store singleton helpers ─────────────────────────────────────────


def test_build_incident_store_falls_back_to_in_memory(monkeypatch):
    """When MongoClient is unavailable _build_store returns InMemoryIncidentStore."""
    import app.core.incident_store as m
    from app.core.incident_store import InMemoryIncidentStore

    # Make MongoIncidentStore.__init__ always fail
    monkeypatch.setattr(m, "MongoClient", None)

    store = m._build_store()
    assert isinstance(store, InMemoryIncidentStore)


def test_get_incident_store_returns_singleton(monkeypatch):
    """get_incident_store caches the result on subsequent calls."""
    import app.core.incident_store as m
    from app.core.incident_store import InMemoryIncidentStore

    monkeypatch.setattr(m, "_incident_store", None)
    monkeypatch.setattr(m, "MongoClient", None)

    s1 = m.get_incident_store()
    s2 = m.get_incident_store()

    assert s1 is s2
    assert isinstance(s1, InMemoryIncidentStore)


# ── InMemorySiteSignalStore ───────────────────────────────────────────────────


def test_in_memory_site_signal_store_save_and_list():
    from app.core.site_signal_store import InMemorySiteSignalStore

    store = InMemorySiteSignalStore()
    store.save_signal({"hostname": "example.com", "eventType": "BLOCK"})
    store.save_signal({"hostname": "other.com", "eventType": "WARN"})

    items = store.list_signals(limit=10)
    assert len(items) == 2
    # Most recent first
    assert items[0]["hostname"] == "other.com"


def test_in_memory_site_signal_store_list_zero_limit():
    from app.core.site_signal_store import InMemorySiteSignalStore

    store = InMemorySiteSignalStore()
    store.save_signal({"hostname": "x.com"})
    assert store.list_signals(limit=0) == []


def test_in_memory_site_signal_store_aggregate_failures_by_site():
    from app.core.site_signal_store import InMemorySiteSignalStore

    store = InMemorySiteSignalStore()
    store.save_signal(
        {"hostname": "a.com", "eventType": "BLOCK", "createdAt": "2024-01-01"}
    )
    store.save_signal(
        {"hostname": "a.com", "eventType": "BLOCK", "createdAt": "2024-01-02"}
    )
    store.save_signal(
        {"hostname": "b.com", "eventType": "WARN", "createdAt": "2024-01-01"}
    )

    rows = store.aggregate_failures_by_site(limit=10)
    assert len(rows) == 2

    # a.com should be first (higher count)
    a = rows[0]
    assert a["hostname"] == "a.com"
    assert a["count"] == 2
    assert a["events"]["BLOCK"] == 2
    assert a["lastSeenAt"] == "2024-01-02"


def test_in_memory_site_signal_store_aggregate_respects_limit():
    from app.core.site_signal_store import InMemorySiteSignalStore

    store = InMemorySiteSignalStore()
    for i in range(5):
        store.save_signal({"hostname": f"host{i}.com", "eventType": "BLOCK"})

    rows = store.aggregate_failures_by_site(limit=2)
    assert len(rows) == 2


def test_in_memory_site_signal_store_aggregate_empty():
    from app.core.site_signal_store import InMemorySiteSignalStore

    store = InMemorySiteSignalStore()
    assert store.aggregate_failures_by_site(limit=10) == []


# ── site_signal_store singleton helpers ───────────────────────────────────────


def test_build_site_signal_store_falls_back_to_in_memory(monkeypatch):
    import app.core.site_signal_store as m
    from app.core.site_signal_store import InMemorySiteSignalStore

    monkeypatch.setattr(m, "MongoClient", None)

    store = m._build_store()
    assert isinstance(store, InMemorySiteSignalStore)


def test_get_site_signal_store_returns_singleton(monkeypatch):
    import app.core.site_signal_store as m
    from app.core.site_signal_store import InMemorySiteSignalStore

    monkeypatch.setattr(m, "_site_signal_store", None)
    monkeypatch.setattr(m, "MongoClient", None)

    s1 = m.get_site_signal_store()
    s2 = m.get_site_signal_store()

    assert s1 is s2
    assert isinstance(s1, InMemorySiteSignalStore)


# ── InMemoryUserStore ─────────────────────────────────────────────────────────


def test_in_memory_user_store_create_and_get_by_email():
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    user = store.create_user(email="Test@Example.com", password_hash="hash123")

    assert user["email"] == "test@example.com"
    assert "id" in user

    fetched = store.get_user_by_email("test@example.com")
    assert fetched is not None
    assert fetched["id"] == user["id"]


def test_in_memory_user_store_create_duplicate_raises():
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    store.create_user(email="dup@example.com", password_hash="h1")

    with pytest.raises(ValueError, match="Email already exists"):
        store.create_user(email="dup@example.com", password_hash="h2")


def test_in_memory_user_store_get_user_by_id():
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    user = store.create_user(email="id@example.com", password_hash="h")

    found = store.get_user_by_id(user["id"])
    assert found is not None
    assert found["email"] == "id@example.com"


def test_in_memory_user_store_get_unknown_user_returns_none():
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    assert store.get_user_by_id("non-existent-id") is None
    assert store.get_user_by_email("nobody@example.com") is None


def test_in_memory_user_store_default_settings():
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    user = store.create_user("s@example.com", "h")
    s = store.get_user_settings(user["id"])

    assert s["guardrailEnabled"] is True
    assert s["autoAnonymize"] is False
    assert "updatedAt" in s


def test_in_memory_user_store_upsert_settings():
    from app.core.user_store import InMemoryUserStore

    store = InMemoryUserStore()
    user = store.create_user("up@example.com", "h")
    payload = {"guardrailEnabled": False, "autoAnonymize": True}

    result = store.upsert_user_settings(user["id"], payload)
    assert result["guardrailEnabled"] is False
    assert result["autoAnonymize"] is True

    # get_user_settings should now return the upserted values
    fetched = store.get_user_settings(user["id"])
    assert fetched["guardrailEnabled"] is False


# ── _default_settings / _build_settings_obj / _clean_path_prefix ─────────────


def test_default_settings_shape():
    from app.core.user_store import _default_settings

    s = _default_settings()
    required_keys = {
        "guardrailEnabled",
        "autoAnonymize",
        "contentModerationEnabled",
        "responseModerationEnabled",
        "avsRevealBlurred",
        "imageModerationEnabled",
        "enabledPlatformIds",
        "customDomains",
        "userAddedPlatforms",
        "protected_urls",
        "updatedAt",
    }
    assert required_keys.issubset(s.keys())


def test_build_settings_obj_with_user_added_platforms():
    from app.core.user_store import _build_settings_obj

    payload = {
        "userAddedPlatforms": [
            {
                "id": "p1",
                "label": "My Tool",
                "domain": "tool.example.com",
                "pathPrefix": "/chat",
                "features": ["textAnalysis"],
            },
            # This one has no domain — should be filtered out
            {"id": "p2", "label": "No Domain", "domain": "", "features": []},
        ]
    }
    result = _build_settings_obj(payload)
    platforms = result["userAddedPlatforms"]
    assert len(platforms) == 1
    assert platforms[0]["domain"] == "tool.example.com"
    assert platforms[0]["pathPrefix"] == "/chat"


def test_build_settings_obj_protected_urls_stripped():
    from app.core.user_store import _build_settings_obj

    payload = {"protected_urls": ["  https://a.com  ", "", "  "]}
    result = _build_settings_obj(payload)
    # Empty/blank URLs filtered out; the valid one is stripped
    assert result["protected_urls"] == ["https://a.com"]


def test_clean_path_prefix_none_returns_none():
    from app.core.user_store import _clean_path_prefix

    assert _clean_path_prefix(None) is None


def test_clean_path_prefix_blank_returns_none():
    from app.core.user_store import _clean_path_prefix

    assert _clean_path_prefix("   ") is None


def test_clean_path_prefix_value_stripped():
    from app.core.user_store import _clean_path_prefix

    assert _clean_path_prefix("  /api  ") == "/api"


# ── user_store singleton helpers ─────────────────────────────────────────────


def test_build_user_store_falls_back_to_in_memory(monkeypatch):
    import app.core.user_store as m
    from app.core.user_store import InMemoryUserStore

    monkeypatch.setattr(m, "MongoClient", None)

    store = m._build_store()
    assert isinstance(store, InMemoryUserStore)


def test_get_user_store_returns_singleton(monkeypatch):
    import app.core.user_store as m
    from app.core.user_store import InMemoryUserStore

    monkeypatch.setattr(m, "_user_store", None)
    monkeypatch.setattr(m, "MongoClient", None)

    s1 = m.get_user_store()
    s2 = m.get_user_store()

    assert s1 is s2
    assert isinstance(s1, InMemoryUserStore)
