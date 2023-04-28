import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    account: string;

    @Column()
    email: string;

    @Column()
    password: string;

    constructor() {
        this.id = 0
        this.account = ""
        this.email = ""
        this.password = ""
    }

}