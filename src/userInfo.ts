import { WebSocket } from "ws";

export default class userInfo {
    constructor(private readonly id: string, readonly name: string, private ws: WebSocket) {}
}