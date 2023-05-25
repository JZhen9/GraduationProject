import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity({name: "user"})
export class User {

    @PrimaryGeneratedColumn({name: "user_id"})
    user_id: number

    @Column({name: "user_name"})
    user_name: string

    @Column({name: "sex_id"})
    sex_id: number

    @Column({name: "email"})
    email: string

    @Column({name: "password"})
    password: string

    constructor() {
        this.user_id = 0
        this.user_name = ""
        this.sex_id = 0
        this.email = ""
        this.password = ""
    }

}