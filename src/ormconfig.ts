import { ConnectionOptions } from 'typeorm'
import { User } from './entity/User'

export const connectionOptions: ConnectionOptions = {
    type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'password',
  database: 'backend_test_with_orm_4109',
  entities: [User],
  synchronize: true,
}