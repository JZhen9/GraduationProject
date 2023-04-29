import express, { Application, Request, Response, NextFunction } from "express"
// .env
import dotenv from "dotenv"
// middleware
import morgan from "morgan"
import { setLoggingColor } from "./middlewares/morganSettings"

import { exportlogger } from "./middlewares/loggerSettings"

// webSocket
import websocket, { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'

// URL package
import url, { URLSearchParams } from "url"
import buildUrl from 'build-url-ts'
import userInfo from "./userInfo"

// UUID
import { v4 as uuidv4 } from 'uuid'

// methods
import checkIsValidateURL from "./jesspackages/checkURL"

// ORM
import "reflect-metadata";
import { createConnection, getConnection } from 'typeorm'
import { User } from "./entity/User";
import { getRepository } from 'typeorm';
import { connectionOptions } from './ormconfig'

// 檢查 req.body 是否為 undefined || null
import bodyParser from 'body-parser';

// jwt tool
import jwtTool, { authenticateToken } from './tools/jwtTool';

// get ur .env as process.env
dotenv.config()

const app: Application = express()

// if process.env.PORT is undefined then port is 5000.
const port = process.env.PORT || 5000

let isShutdown = false

const morganMiddleware = setLoggingColor(false);

app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isShutdown) {
        return next()
    }
    res.setHeader("Connection", "close");
    res.status(503).send("Server is in the process of restarting")
})

app.use(morganMiddleware);

// 檢查 request.body 的 middleware
app.use(bodyParser.urlencoded({ extended: false }));

// http server
let server = app.listen(port, () => {
    console.log(`Server running http://127.0.0.1:${port}`)
});

let userInfos: userInfo[] = []

// 設定 webSocket
let wsRoute = new WebSocketServer({
    server: server
})

// 創建 TypeORM 的連接
createConnection(connectionOptions)
    .then(() => console.log('Database connected'))
    .catch((err) => console.error('Database connection error:', err));

// 建立user表
createConnection(connectionOptions).then(async connection => {

    console.log("Connected to DB");

    // 创建user表
    await connection.query(
        `CREATE TABLE IF NOT EXISTS user (
        id INT NOT NULL AUTO_INCREMENT,
        account VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        PRIMARY KEY (id)
    )`);

    // 将User实体类与user表映射
    connection.getRepository(User);

}).catch(error => console.log(error));

// Login API
app.post('/login', express.json(), async (request: Request, response: Response) => {
    if (request.body.account != null && request.body.pwd != null) {
        const reqUrl = url.parse(request.url)

        // 將 account 與 pwd 與資料庫比對 return

        // 取得目前連線(mySQL)
        const userRepository = getRepository(User);
        const user = await userRepository.findOne({
            where: {
                account: request.body.account,
                password: request.body.pwd,
            }
        });

        if (user == null){
            return response.status(400).send("帳號密碼錯誤").end()
        }

        // 生成 token
        const token = jwtTool.generateToken(user);

        return response.status(200).type('text/plain').send(`account: ${request.body.account} , pwd: ${request.body.pwd}, token: ${token}`).end()
    }
    return response.status(400).send("請求中未包含帳號或密碼或是參數為空").end()
})

// Register API
app.post('/register', express.json(), async (request: Request, response: Response) => {
    if (request.body.account != null && request.body.pwd != null && request.body.email != null) {

        // 將 account email 與 pwd 存於資料庫 return OK
        try {
            const userRepository = await getConnection().getRepository(User)
            const user = userRepository.create({
                account: request.body.account,
                email: request.body.email,
                password: request.body.pwd
            });
            await userRepository.save(user)
        } catch (error) {
            // 以防萬一
            return response.status(400).type('text/plain').send(error).end()
        }
        return response.status(200).type('text/plain').send("OK").end()
    }
    return response.status(400).send("請求中未包含帳號密碼或信箱或是參數為空").end()
})

// ping pong
app.get('/ping', (require: Request, response: Response) => {
    return response.status(200).send("pong pong pong").end()
})

const router = express.Router();
router.use(authenticateToken)

wsRoute.on('connection',  (ws: WebSocket, req: IncomingMessage) => {
    if (req.url || req.url == "") {
        const location = url.parse(req.url) // 取得 Url

        let searchParams = new URLSearchParams(location.search!!)
        let name = searchParams.has("name") ? searchParams.get("name") as string : ""
        if (!searchParams.has("name")) {
            ws.close(1011, "name is empty.")
            return
        } else if (userInfos.filter(userInfo => userInfo["name"] == name).length == 1) {
            ws.close(1011, "name is existed.")
            return
        }
        let id = uuidv4()
        ws.send(`id: ${id} sPname: ${name}`)

        // 加入使用者
        userInfos.push(new userInfo(id, name, ws))

        const time = new Date()
        for (let user of userInfos) {
            // 傳給這次連線的人
            let userWs = user["ws"]

            userWs.send(`${time.toLocaleTimeString()} / ${name} join to the room.`)
        }

        // 使用者傳訊息
        ws.on('message', (msg: websocket.RawData) => { // ws收到訊息時執行 msg是使用者傳來的
            if (!checkIsValidateURL(msg.toString())) {
                return
            }

            let urlMsg = url.parse(msg.toString())

            let protocol = urlMsg.protocol

            if (protocol === "app") {
                // 當 protocol 為 app

            } else if (protocol === "pi") {
                // 當 protocol 為 pi

            }

            // ws.send(msg);

            // for (let user of userInfos) {
            //     let userId = user["id"]
            //     let userWs = user["ws"]

            //     if (userId != id) {
            //         userWs.send(`${time.toLocaleTimeString()} / ${name} : ${msg}`)
            //     }
            // }
        });

        // 使用者離線
        ws.on('close', () => {
            for (let user of userInfos) {
                let userId = user["id"]
                let userWs = user["ws"]

                if (userId != id) {
                    userWs.send(`${time.toLocaleTimeString()} / ${name} : LEFT`)
                }
            }
            userInfos = userInfos.filter((user) => user["id"] != id)
        });
    }
});

let cleanUp = () => {
    isShutdown = true
    console.log(`server is shuting down...`)
    for (let user of userInfos) {
        user["ws"].send("server close...")
        user["ws"].close()
    }
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
