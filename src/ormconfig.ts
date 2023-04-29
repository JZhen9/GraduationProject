import { ConnectionOptions } from 'typeorm'
import { User } from './entity/User'
import dotenv from 'dotenv';
dotenv.config();

const {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_PORT,
  MYSQL_ENTITIES,
} = process.env;

if (
  !MYSQL_HOST ||
  !MYSQL_USER ||
  !MYSQL_PASSWORD ||
  !MYSQL_DATABASE ||
  !MYSQL_PORT ||
  !MYSQL_ENTITIES
) {
  console.error('Missing environment variables for MySQL connection');
  process.exit(1);
}

export const connectionOptions: ConnectionOptions =
{
  type: 'mysql',
  host: MYSQL_HOST,
  port: parseInt(MYSQL_PORT, 10),
  username: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  entities: [MYSQL_ENTITIES],
  synchronize: true,
}