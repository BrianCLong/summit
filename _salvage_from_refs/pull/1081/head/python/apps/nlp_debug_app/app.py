import re

import streamlit as st

# Optional NLP dependencies
try:
    from transformers import pipeline

    ner_pipeline = pipeline("ner", grouped_entities=True)
    sentiment_pipeline = pipeline("sentiment-analysis")
except Exception:
    ner_pipeline = None
    sentiment_pipeline = None

st.set_page_config(page_title="NLP Debugger", layout="wide")
st.title("NLP Debug Interface")

text = st.text_area("Input text", height=200)
if st.button("Analyze") and text:
    st.subheader("Entities")
    entities = []
    if ner_pipeline:
        for ent in ner_pipeline(text):
            entities.append(
                {
                    "text": ent.get("word"),
                    "label": ent.get("entity_group"),
                    "start": ent.get("start"),
                    "end": ent.get("end"),
                    "score": round(ent.get("score", 0.0), 3),
                }
            )
    else:
        pattern = re.compile(r"\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b")
        for match in pattern.finditer(text):
            entities.append(
                {
                    "text": match.group(),
                    "label": "UNKNOWN",
                    "start": match.start(),
                    "end": match.end(),
                    "score": 0.5,
                }
            )
    if entities:
        st.dataframe(entities)
    else:
        st.info("No entities detected")

    st.subheader("Sentiment")
    if sentiment_pipeline:
        result = sentiment_pipeline(text)[0]
        st.json(
            {"sentiment": result.get("label"), "confidence": round(result.get("score", 0.0), 3)}
        )
    else:
        pos_words = {
            "good",
            "great",
            "excellent",
            "happy",
            "fortunate",
            "correct",
            "superior",
            "positive",
        }
        neg_words = {
            "bad",
            "terrible",
            "poor",
            "sad",
            "unfortunate",
            "wrong",
            "inferior",
            "negative",
        }
        tokens = re.findall(r"\w+", text.lower())
        pos = sum(1 for t in tokens if t in pos_words)
        neg = sum(1 for t in tokens if t in neg_words)
        if pos > neg:
            label = "POSITIVE"
            conf = pos / (pos + neg) if pos + neg > 0 else 0.0
        elif neg > pos:
            label = "NEGATIVE"
            conf = neg / (pos + neg) if pos + neg > 0 else 0.0
        else:
            label = "NEUTRAL"
            conf = 0.0
        st.json({"sentiment": label, "confidence": round(conf, 3)})
