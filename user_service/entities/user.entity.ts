import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({ nullable: true })
    role: string;

    constructor() {
        this.id = 0; // Default value, will be overridden by TypeORM
        this.email = '';
        this.password = '';
        this.role = '';
    }
}