import express, { Application, Request, Response, NextFunction } from "express"

// .env
import dotenv from "dotenv"

// middleware
import morgan from "morgan"
import { setLoggingColor } from "./middlewares/morganSettings"

// webSocket
import websocket, { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage, createServer } from 'http'

// URL package
import url, { URLSearchParams } from "url"
import userInfo from "./userInfo"

// UUID
import { v4 as uuidv4 } from 'uuid'

// methods
import checkIsValidateURL from "./jessPackages/checkURL"

// ORM
import "reflect-metadata";
import { User } from "./database/entity/user.entity";

// connect to mysql
import { myDataSource } from "./database/app_data_source"

// 檢查 req.body 是否為 undefined || null
import bodyParser from 'body-parser';

// JWT
import jwtTool, { authenticateToken } from './tools/jwtTool';

// JSON
import { json } from "stream/consumers"
import { JsonWebTokenError } from "jsonwebtoken"

// objs
import { loginResult } from './objs/login_result'
import { registerResult } from './objs/register_result'
import { sendMail } from "./sendEmail"

// redis
import { createClient } from 'redis';

// jessPackages
import { connectWS } from "./jessPackages/webSocket/ws"

// get ur .env as process.env
dotenv.config()

const app: Application = express()

// redis config
const client = createClient()
client.on('error', err => console.log('Redis Client Error', err))

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

const server = createServer(app)

let userInfos: userInfo[] = []

// 設定 webSocket
let wsRoute = new WebSocketServer({
    server: server
})

// 建立資料庫連線
myDataSource
    .initialize()
    .then(() => {
        console.log("Data Source has been initialized!")
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })

// 測試redis連線
app.get('/', async(req, res, next) => {
    await client.connect()
    console.log('redis connected')
    await client.disconnect()
    console.log('redis disconnect')
    return res.send("finish").end()
})

// 驗證頁面
app.get('/auth/:uuid', async (req, res, next) => {
    await client.connect()
    let id = req.params.uuid

    const userStr = await client.get(id)
    let user: User | null = null

    let result = './auth/error.html'
    if (userStr != null) {
        result = './auth/index.html'
        user = JSON.parse(userStr) as User
        await client.del(id)
    }

    res.sendFile(result, {root: __dirname})

    if (user != null) {
        console.log(`user: ${user}`)
        let newUser = await myDataSource.getRepository(User).create(user)
        await myDataSource.getRepository(User).save(newUser)
    } else {
        console.log('user = null')
    }

    await client.disconnect()
})

// Login API
app.post('/login', express.json(), async (request: Request, response: Response) => {
    response.type('json')
    let failedLogin: loginResult = {
        resultStatus: 400,
        errorMessage: "請求中未包含帳號或密碼或是參數為空",
        resultData: ""
    }
    let successLogin: loginResult = {
        resultStatus: 200,
        errorMessage: "",
        resultData: ""
    }
    let json = JSON.stringify(failedLogin)

    if (request.body.account != null && request.body.pwd != null) {
        const reqUrl = url.parse(request.url)

        // 將 account 與 pwd 與資料庫比對 return

        // 取得目前連線(mySQL)
        const user_info = await myDataSource.getRepository(User).findOne({
            where: {
                user_name: request.body.account,
                password: request.body.pwd,
            }
        })

        if (user_info == null){
            failedLogin.resultStatus = 400
            failedLogin.errorMessage = "帳號密碼錯誤"
            json = JSON.stringify(failedLogin)
            return response.status(400).send(json).end()
        }

        // 生成 token
        const token = jwtTool.generateToken(user_info);
        successLogin.resultData = token
        json = JSON.stringify(successLogin)

        return response.send(json).end()
    }
    
    return response.status(400).send(json).end()
})

// Register API
app.post('/register', express.json(), async (request: Request, response: Response) => {
    response.type('json')
    let failedRegister: registerResult = {
        resultStatus: 400,
        errorMessage: "請求中未包含帳號或密碼或是參數為空",
        resultMessage: ""
    }
    let successRegister: registerResult = {
        resultStatus: 200,
        errorMessage: "",
        resultMessage: "OK"
    }
    let json = JSON.stringify(failedRegister)

    if (request.body.account != null && request.body.pwd != null && request.body.email != null) {

        // 將 account email 與 pwd 存於資料庫 return OK
        try {
            await client.connect()

            let uuid = uuidv4()

            // redis
            await client.set(uuid, JSON.stringify({
                user_name: request.body.account,
                sex_id: 2,
                email: request.body.email,
                password: request.body.pwd
            }))

            let todayEnd = 24*60*60;
            // console.log(todayEnd)
            await client.expire(uuid, todayEnd);

            await client.disconnect()
            
            // 寄送驗證email
            sendMail(uuid, request.body.email)
                .then(result => console.log('Email Sent...', result))
                .catch((error) => console.log('Error: ', error))

        } catch (error) {
            // 以防萬一
            if (error instanceof Error) {
                failedRegister.errorMessage = error.message
            } else {
                failedRegister.errorMessage = "Unknown Error"
            }
            json = JSON.stringify(failedRegister)
            return response.status(400).send(json).end()
        }
        json = JSON.stringify(successRegister)
        return response.status(200).send(json).end()
    }
    return response.status(400).send(json).end()
})

// ping pong
app.get('/ping', (require: Request, response: Response) => {
    return response.status(200).send("pong").end()
})

// check token
app.post('/checkToken', express.json(), async (require: Request, response: Response) => {
    // console.log(require.body.token)
    response.type('json')
    let success = {
        msg: "I'm exist!"
    }
    let bad = {
        msg: "bad token :("
    }
    let json = JSON.stringify(bad)
    let user = null
    try{
        user = jwtTool.verifyToken(require.body.token as string)
    } catch {
        return response.status(404).send(json).end()
    }
    if (user != null) {
        json = JSON.stringify(success)
        return response.status(200).send(json).end()
    }
    return response.status(404).send(json).end()
})

// //test token
// app.get('/testToken', (require, response) => {
//     response.writeHead(301, { "Location": authorizationUrl });
//     return response.status(200).send("ok").end()
// })

const router = express.Router()
router.use(authenticateToken)

// webSocket 連線
connectWS(wsRoute, client)

// 中斷連線
let cleanUp = () => {
    isShutdown = true
    console.log(`server is shuting down...`)
    
    client.quit().then(() => {
        console.log('redis quit')
    }).catch(err => {
        console.log(err)
    })
    
    for (let user of userInfos) {
        user["ws"].send("server close...")
        user["ws"].close()
    }
    wsRoute.close()
    console.log('wsRoute quit')
    server.close(err => {
        console.log(err?.message)
        console.log(`server is already shutdown`)
        process.exit()
    })
    
    setTimeout(() => {
        console.error(`could not close connections in time, forcing shut down`)
        process.exit(-1)
    }, 10 * 1000)
}

process.on("SIGINT", cleanUp)
process.on("SIGTERM", cleanUp)

server.listen(port, () => {
    console.log(`Server running http://127.0.0.1:${port}`)
})
