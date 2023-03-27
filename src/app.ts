import express, { Application, Request, Response, NextFunction } from "express";
// .env
import dotenv from "dotenv"
// middleware
import morgan from "morgan"
import {setLoggingColor} from "./middlewares/morganSettings";

import {exportlogger} from "./middlewares/loggerSettings";

// get ur .env as process.env
dotenv.config()

const app: Application = express()

// if process.env.PORT is undefined then port is 5000.
const port = process.env.PORT || 5000

let isShutdown = false

const morganMiddleware = setLoggingColor(false)

app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isShutdown) {
        return next()
    }
    res.setHeader("Connection", "close")
    res.status(503).send("Server is in the process of restarting")
})

app.use(morganMiddleware)

app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.json({
        "message": 'Hello'
    })
});

app.post('/', express.json(), (req: Request, res: Response, next: NextFunction) => {
    // Object.keys(req.body).forEach(key => {
    //     console.log(req.body[key])
    // })
    // console.log(req.body)
    res.json({
        "message": 'OK'
    })
})

let server = app.listen(port, () => {
    console.log(`Server running http://127.0.0.1:${port}`)
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
