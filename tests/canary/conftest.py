import pytest


class MockPGClient:
    def __init__(self):
        self.state = {}

    def fetch_one(self, query):
        import re
        match = re.search(r"pk_col1=(\d+) AND pk_col2='([^']+)'", query)
        if match:
            pk1, pk2 = match.groups()
            pk = f"{pk1}|{pk2}"
            if pk in self.state:
                return self.state[pk]
        return None

    def execute(self, query, params):
        if "INSERT INTO" in query:
            pk1 = params.get("pk1")
            pk2 = params.get("pk2")
            pk = f"{pk1}|{pk2}"

            if pk not in self.state:
                self.state[pk] = {"col_a": params.get("a"), "last_applied_lsn": params.get("lsn")}
            else:
                current_lsn = self.state[pk].get("last_applied_lsn", 0)
                new_lsn = params.get("lsn")
                if new_lsn > current_lsn:
                    self.state[pk] = {"col_a": params.get("a"), "last_applied_lsn": new_lsn}

class MockNeoClient:
    def __init__(self):
        self.state = {}

    def run(self, query, pk=None):
        class Result:
            def __init__(self, data):
                self.data = data
            def single(self):
                return self.data

        if "MERGE" in query:
            # this is for execute, not fetch
            pass
        elif "MATCH" in query:
            if pk in self.state:
                return Result(self.state[pk])
            return Result(None)

        return Result(None)

    def execute_upsert(self, pk, props, lsn):
        if pk not in self.state:
            self.state[pk] = {"col_a": props.get("col_a"), "lsn": lsn}
        else:
            current_lsn = self.state[pk].get("lsn", 0)
            if lsn > current_lsn:
                self.state[pk] = {"col_a": props.get("col_a"), "lsn": lsn}

class MockConsumer:
    def __init__(self, pg, neo):
        self.pg = pg
        self.neo = neo
        import sys
        sys.path.append(".")
        from consumers.mapping.upsert_mapper import map_event_to_upsert
        self.map_event_to_upsert = map_event_to_upsert

    def handle(self, evt):
        if evt.get("op") == "d":
            # delete handling not strictly defined in PR description,
            # assuming we skip or process tombstone based on your pipeline
            return

        sql, params, meta = self.map_event_to_upsert(evt)
        self.pg.execute(sql, params)

        pk_dict = evt.get("after", {}).get("pk", {})
        pk_str = f"{pk_dict.get('pk1')}|{pk_dict.get('pk2')}"
        props = {"col_a": evt.get("after", {}).get("col_a")}

        self.neo.execute_upsert(pk_str, props, meta["lsn"])

@pytest.fixture
def client_pg():
    return MockPGClient()

@pytest.fixture
def client_neo():
    return MockNeoClient()

@pytest.fixture
def consumer(client_pg, client_neo):
    return MockConsumer(client_pg, client_neo)
