-- Drop the user_sessions table as it is no longer needed with stateless JWT refresh tokens
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS token_blacklist;
