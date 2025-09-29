import json
import os
import time
import random
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

print("Ingestion service starting up...")

KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
RAW_POSTS_TOPIC = 'raw.posts'

producer = None
max_attempts = 10
delay = 5

for attempt in range(max_attempts):
    try:
        print(f"Attempting to connect to Kafka (Attempt {attempt + 1}/{max_attempts})...")
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(','),
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        producer.bootstrap_connected()
        print("Successfully connected to Kafka.")
        break
    except NoBrokersAvailable as e:
        print(f"Kafka connection failed: {e}. Retrying in {delay} seconds...")
        time.sleep(delay)
    except Exception as e:
        print(f"An unexpected error occurred during Kafka connection: {e}")
        time.sleep(delay)
else:
    raise Exception("Failed to connect to Kafka after multiple attempts.")

def get_simulated_post():
    """Generates a fake post object."""
    platforms = ['Twitter', 'Reddit', 'Telegram', '4chan']
    users = ['user_a', 'user_b', 'user_c', 'whistleblower_x', 'anon123']
    messages = [
        'Just saw something suspicious near the power plant.',
        'There is a planned protest tomorrow at city hall. #protest',
        'Disinformation campaign targeting the election is in full swing.',
        'A new exploit for CVE-2025-XXXX is being shared on the dark web.',
        'I have documents proving corruption in the local government.'
    ]
    return {
        'id': str(random.randint(10000, 99999)),
        'platform': random.choice(platforms),
        'timestamp': time.time(),
        'text': random.choice(messages),
        'media': [],
        'metadata': {
            'user': random.choice(users),
            'location': 'some_location'
        }
    }

def main():
    """Main function to produce simulated posts to Kafka."""
    print("Starting ingestion service...")
    while True:
        post = get_simulated_post()
        producer.send(RAW_POSTS_TOPIC, value=post)
        print(f"Sent post: {post['id']}")
        time.sleep(random.uniform(1, 5))

if __name__ == "__main__":
    main()
