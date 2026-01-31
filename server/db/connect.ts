import { buildRdsAuthToken } from './iam';
export async function getConn() {
  if (process.env.DB_AUTH_MODE === 'iam') {
    const token = await buildRdsAuthToken(
      process.env.DB_HOST!,
      process.env.DB_USER!,
    );
    return new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: token,
      ssl: true,
    });
  }
}
