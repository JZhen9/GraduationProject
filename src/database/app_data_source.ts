import { DataSource } from "typeorm"
import dotenv from 'dotenv';
dotenv.config();

const {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_PORT,
} = process.env;

if (
  !MYSQL_HOST ||
  !MYSQL_USER ||
  !MYSQL_PASSWORD ||
  !MYSQL_DATABASE ||
  !MYSQL_PORT
) {
  console.error('Missing environment variables for MySQL connection');
  process.exit(1);
}

export const myDataSource = new DataSource({
    type: 'mysql',
    host: MYSQL_HOST,
    port: parseInt(MYSQL_PORT, 10),
    username: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    entities: [__dirname+"/**/*.entity.{ts,js}"],
    logging: true,
    synchronize: true,
})