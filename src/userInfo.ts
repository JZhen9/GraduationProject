import { WebSocket } from "ws";

export default class userInfo {
    constructor(private readonly id: string, readonly name: string, private ws: WebSocket) {}
}

export class idWithWS{
    constructor(private readonly id: string, private ws: WebSocket){}
}