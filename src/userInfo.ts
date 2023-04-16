import { WebSocket } from "ws";

export default class userInfo {
    constructor(private readonly id: string, private readonly name: string, private readonly ws: WebSocket) {}
}