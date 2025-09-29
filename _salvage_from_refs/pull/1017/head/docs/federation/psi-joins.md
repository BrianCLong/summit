# PSI Joins

OPRF/ECDH based private set intersection is used inside clean rooms.
Sessions issue ephemeral key pairs and random nonces with a TTL.
Join handles are processed in the enclave; only intersection cardinality
and token references are stored. No raw identifiers ever leave the room.
