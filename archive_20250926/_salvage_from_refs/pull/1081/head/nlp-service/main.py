import json
import os

import spacy
from kafka import KafkaConsumer, KafkaProducer
from spacy.cli import download as spacy_download

print("NLP service starting up...")

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
RAW_POSTS_TOPIC = "raw.posts"
NLP_POSTS_TOPIC = "nlp.posts"
SPACY_MODEL = os.environ.get("SPACY_MODEL", "en_core_web_sm")

nlp = None

# Check if spaCy model is available, if not, download it
try:
    print(f"Attempting to load spaCy model '{SPACY_MODEL}'...")
    nlp = spacy.load(SPACY_MODEL)
    print(f"spaCy model '{SPACY_MODEL}' already loaded.")
except OSError:
    print(f"spaCy model '{SPACY_MODEL}' not found. Attempting to download...")
    try:
        spacy_download(SPACY_MODEL)
        print(f"Download of '{SPACY_MODEL}' successful. Attempting to load again...")
        nlp = spacy.load(SPACY_MODEL)
        print(f"spaCy model '{SPACY_MODEL}' downloaded and loaded.")
    except Exception as e:
        print(f"Error downloading or loading spaCy model: {e}")
        exit(1)  # Exit if model cannot be downloaded or loaded

consumer = KafkaConsumer(
    RAW_POSTS_TOPIC,
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
    auto_offset_reset="earliest",
    group_id="nlp-processor",
    value_deserializer=lambda x: json.loads(x.decode("utf-8")),
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


def main():
    """Main function to consume, process, and produce NLP-enriched posts."""
    print("Starting NLP service consumer...")
    for message in consumer:
        post = message.value
        print(f"Processing post: {post['id']}")

        # Perform NLP
        doc = nlp(post["text"])

        entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
        sentiment = {
            "polarity": doc.sentiment,
            "subjectivity": 0.0,
        }  # spaCy 3+ doesn't have sentiment out of box

        enriched_post = post.copy()
        enriched_post["nlp"] = {"entities": entities, "sentiment": sentiment}

        producer.send(NLP_POSTS_TOPIC, value=enriched_post)
        print(f"Enriched and sent post: {enriched_post['id']}")


if __name__ == "__main__":
    main()
