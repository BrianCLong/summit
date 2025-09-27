update transactions set card_last4 = NULL, ip = NULL where created_at < now() - interval '365 days';

