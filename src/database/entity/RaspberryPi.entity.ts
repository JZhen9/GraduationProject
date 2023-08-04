import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity({name: "RaspberryPi"})
export class RaspberryPi {

    @PrimaryGeneratedColumn({name: "raspberry_id"})
    raspberry_id: number

    @Column({name: "family_id"})
    family_id: number

    constructor(id: number, family: number) {
        this.raspberry_id = id
        this.family_id = family
    }

}