import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv"
import morgan from "morgan"
import chalk from "chalk"

dotenv.config()

const app: Application = express()

const port = process.env.PORT || 5000

let isShutdown = false

const morganMiddleware = morgan(function (tokens, req, res) {
    return [
        chalk.hex('#f78fb3').bold(tokens.date(req, res)),
        chalk.yellow(tokens['remote-addr'](req, res)),
        chalk.hex('#34ace0').bold(tokens.method(req, res)).padStart(38),
        chalk.hex('#ffb142').bold(tokens.status(req, res)),
        chalk.hex('#2ed573').bold(tokens['response-time'](req, res) + ' ms').padStart(42),
        chalk.hex('#ff5252').bold(tokens.url(req, res)),
    ].join('  |  ')
});

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
    Object.keys(req.body).forEach(key => {
        console.log(req.body[key])
    })
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
    server.close(() => {
        console.log(`server is shuting down`)
        process.exit()
    })

    setTimeout(() => {
        console.error(`could not close connections in time, forcing shut down`)
        process.exit(-1)
    }, 30 * 1000)
}

process.on("SIGINT", cleanUp)
process.on("SIGTERM", cleanUp)
