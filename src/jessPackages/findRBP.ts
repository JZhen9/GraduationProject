import { pid } from "process"
import { myDataSource } from "../database/app_data_source"
import { RaspberryPi } from "../database/entity/RaspberryPi.entity"

export async function findPiById(id: number) {
    return await myDataSource.getRepository(RaspberryPi).findOne({
        where: {
            raspberry_id: id
        }
    })
}

export async function addPi(id: number, family: number) {
    let pi = new RaspberryPi(id, family)
    let newPi = await myDataSource.getRepository(RaspberryPi).create(pi)
    await myDataSource.getRepository(RaspberryPi).save(newPi)
    return findPiById(id)
}