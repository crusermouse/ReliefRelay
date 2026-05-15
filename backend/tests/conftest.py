import sys
from unittest.mock import MagicMock

# Mock required dependencies before any backend imports
for module in ["pydantic_settings", "fastapi", "ollama", "chromadb"]:
    if module not in sys.modules:
        sys.modules[module] = MagicMock()

import pytest
import sqlite3

@pytest.fixture(autouse=True)
def fresh_db(monkeypatch):
    import sqlite3
    from tools import case_manager

    # Do not mock settings.CASES_DB to prevent SQLite from creating on-disk files
    # under MagicMock string representations. Instead, we completely intercept the connection creation.

    # Create an in-memory database that stays open for the duration of the test
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row

    # Since the codebase calls conn.close(), we must provide a dummy connection
    # wrapper that ignores close().

    class DummyConnection:
        def __init__(self, real_conn):
            self.real_conn = real_conn

        def execute(self, *args, **kwargs):
            return self.real_conn.execute(*args, **kwargs)

        def commit(self):
            self.real_conn.commit()

        def close(self):
            # Do nothing so the connection stays alive for other queries in the test
            pass

        @property
        def row_factory(self):
            return self.real_conn.row_factory

        @row_factory.setter
        def row_factory(self, value):
            self.real_conn.row_factory = value

    def _mock_get_conn():
        return DummyConnection(conn)

    monkeypatch.setattr(case_manager, "_get_conn", _mock_get_conn)

    # Initialize the tables for the fresh DB
    case_manager._init_db()

    yield

    # Properly close the real connection after the test
    conn.close()
