import streamlit as st
from intelgraph_py.models import Entity, Relationship
from intelgraph_py.storage.neo4j_store import Neo4jStore

st.set_page_config(page_title="IntelGraph", layout="wide")
st.title("IntelGraph Streamlit Console")

with st.sidebar:
    st.subheader("Neo4j Connection")
    uri = st.text_input("NEO4J_URI", value="bolt://localhost:7687")
    user = st.text_input("NEO4J_USER", value="neo4j")
    password = st.text_input("NEO4J_PASSWORD", type="password", value="testpassword")
    db = st.text_input("NEO4J_DATABASE (optional)", value="")
    connect = st.button("Connect")

if connect:
    store = Neo4jStore(uri, user, password, database=db or None)
    st.success("Connected")

    st.subheader("Seed")
    c1, c2 = st.columns(2)
    with c1:
        eid = st.text_input("Entity ID", value="alice")
        etype = st.text_input("Entity Type", value="Person")
        if st.button("Upsert Entity"):
            store.upsert_entity(Entity(id=eid, type=etype))
            st.info("Entity upserted")
    with c2:
        src = st.text_input("Rel Source", value="alice")
        dst = st.text_input("Rel Target", value="acme")
        kind = st.text_input("Rel Kind", value="EMPLOYED_BY")
        start = st.text_input("Start (ISO)", value="2015-01-01")
        end = st.text_input("End (ISO)", value="2019-12-31")
        conf = st.slider("Confidence", 0.0, 1.0, 0.9)
        if st.button("Upsert Relationship"):
            store.upsert_entity(Entity(id=src, type="Person"))
            store.upsert_entity(Entity(id=dst, type="Org"))
            store.upsert_relationship(
                Relationship(src=src, dst=dst, kind=kind, start=start, end=end, confidence=conf)
            )
            st.info("Relationship upserted")

    st.subheader("Query")
    qid = st.text_input("Query neighbors of", value="alice")
    depth = st.slider("Depth", 1, 4, 2)
    if st.button("Run"):
        data = store.neighbors(qid, depth)
        st.json(data)
