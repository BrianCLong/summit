SELECT id, md5(name || coalesce(email, '')) as checksum
FROM customer
ORDER BY id
