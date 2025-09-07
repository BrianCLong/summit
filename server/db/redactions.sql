UPDATE users SET email = CONCAT('u', id, '@example.org'), ssn = NULL;
UPDATE payments SET card_last4 = '0000', card_token = NULL;
-- … add tables as needed