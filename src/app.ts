import express, { Application, Request, Response, NextFunction } from "express";
// .env
import dotenv from "dotenv";
// middleware
import morgan from "morgan"
import { setLoggingColor } from "./middlewares/morganSettings";

import { exportlogger } from "./middlewares/loggerSettings";

// webSocket
import websocket, { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
// URL package
import url, { URLSearchParams } from "url";
import buildUrl from 'build-url-ts';
import userInfo from "./userInfo";
// UUID
import {v4 as uuidv4} from 'uuid';

// get ur .env as process.env
dotenv.config();

const app: Application = express();

// if process.env.PORT is undefined then port is 5000.
const port = process.env.PORT || 5000;

let isShutdown = false;

// url
buildUrl('http://example.com', {
    path: 'about',
    hash: 'contact',
    queryParams: {
        bar: ['foo', 'bar']
    }
});

const morganMiddleware = setLoggingColor(false);

app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isShutdown) {
        return next();
    }
    res.setHeader("Connection", "close");
    res.status(503).send("Server is in the process of restarting");
})

app.use(morganMiddleware);

let server = app.listen(port, () => {
    console.log(`Server running http://127.0.0.1:${port}`);
});

let userInfos: userInfo[] = [];

// 設定 webSocket
let wsRoute = new WebSocketServer({
    server: server
});

wsRoute.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    if (req.url || req.url == "") {
        const location = url.parse(req.url); // 取得 Url

        let searchParams = new URLSearchParams(location.search!!);
        let name = searchParams.has("name")? searchParams.get("name") as string : "";
        if (!searchParams.has("name")){
            ws.close(1011, "name is empty.")
            return
        } else if (userInfos.filter(userInfo => userInfo["name"] == name).length == 1) {
            ws.close(1011, "name is existed.")
            return
        }
        let id = uuidv4();
        ws.send(`id: ${id} sPname: ${name}`);

        // 加入使用者
        userInfos.push(new userInfo(id, name, ws));

        const time = new Date();
        for(let user of userInfos) {
            // 傳給這次連線的人
            let userWs = user["ws"];

            userWs.send(`${time.toLocaleTimeString()} / ${name} join to the room.`);
        }

        
        // 使用者傳訊息
        ws.on('message', (msg: websocket.RawData) => { // ws收到訊息時執行 msg是使用者傳來的
            ws.send(msg);

            for(let user of userInfos) {
                let userId = user["id"];
                let userWs = user["ws"];

                if (userId != id){
                    userWs.send(`${time.toLocaleTimeString()} / ${name} : ${msg}`);
                }
            }
        });

        // 使用者離線
        ws.on('close', () => {
            for(let user of userInfos) {
                let userId = user["id"];
                let userWs = user["ws"];

                if (userId != id){
                    userWs.send(`${time.toLocaleTimeString()} / ${name} : LEFT`);
                }
            }
        });
    }
});

let cleanUp = () => {
    isShutdown = true
    console.log(`server is shuting down...`)
    server.close(() => {
        console.log(`server is already shutdown`)
        process.exit()
    })

    setTimeout(() => {
        console.error(`could not close connections in time, forcing shut down`)
        process.exit(-1)
    }, 30 * 1000)
}

process.on("SIGINT", cleanUp)
process.on("SIGTERM", cleanUp)
