import { myDataSource } from "../database/app_data_source"
import { User } from "../database/entity/user.entity"

export async function findUserById(id: number) {
    return await myDataSource.getRepository(User).findOne({
        where: {
            user_id: id
        }
    })
}