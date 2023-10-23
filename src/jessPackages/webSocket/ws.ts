// webSocket
import websocket, { WebSocket } from 'ws'
import { IncomingMessage } from 'http'
// JWT
import jwtTool from "../../tools/jwtTool"
import { JsonWebTokenError } from 'jsonwebtoken'
// UUID
import { stringify, v4 as uuidv4 } from 'uuid'
// jessPackages
import checkIsValidateMessage from "../../jessPackages/checkURL"
// URL package
import url from "url"
import { findUserById } from '../findUser'
import { User } from '../../database/entity/user.entity'
// userInfos
import {idWithWS} from '../../userInfo'
// redis
import type { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from 'redis'
import { isStringObject } from 'util/types'
import { isErrored } from 'stream'
import { redis } from 'googleapis/build/src/apis/redis'
import { addPi, findPiById } from '../findRBP'
import { RaspberryPi } from '../../database/entity/RaspberryPi.entity'
import { kMaxLength } from 'buffer'

export function connectWS(wsRoute: websocket.Server<websocket.WebSocket>, redisClient: RedisClientType<{
    graph: {
        CONFIG_GET: typeof import("@redis/graph/dist/commands/CONFIG_GET");
        configGet: typeof import("@redis/graph/dist/commands/CONFIG_GET");
        CONFIG_SET: typeof import("@redis/graph/dist/commands/CONFIG_SET");
        configSet: typeof import("@redis/graph/dist/commands/CONFIG_SET");
        DELETE: typeof import("@redis/graph/dist/commands/DELETE");
        delete: typeof import("@redis/graph/dist/commands/DELETE");
        EXPLAIN: typeof import("@redis/graph/dist/commands/EXPLAIN");
        explain: typeof import("@redis/graph/dist/commands/EXPLAIN");
        LIST: typeof import("@redis/graph/dist/commands/LIST");
        list: typeof import("@redis/graph/dist/commands/LIST");
        PROFILE: typeof import("@redis/graph/dist/commands/PROFILE");
        profile: typeof import("@redis/graph/dist/commands/PROFILE");
        QUERY: typeof import("@redis/graph/dist/commands/QUERY");
        query: typeof import("@redis/graph/dist/commands/QUERY");
        RO_QUERY: typeof import("@redis/graph/dist/commands/RO_QUERY");
        roQuery: typeof import("@redis/graph/dist/commands/RO_QUERY");
        SLOWLOG: typeof import("@redis/graph/dist/commands/SLOWLOG");
        slowLog: typeof import("@redis/graph/dist/commands/SLOWLOG");
    };
} & RedisModules, RedisFunctions, RedisScripts>) {
    let users: idWithWS[] = []
    wsRoute.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        let user_id: number = Number.NaN
        let user_info: User | null = null
        let pi_info: RaspberryPi | null = null
        let isUser: boolean
        
        if (req.headers.token == undefined || req.headers.token == null || req.headers.token.length == 0) {
            ws.close(1011, "token is undefined or null.")
            return
        }
        try {
            let user = jwtTool.verifyToken(req.headers.token as string)
            console.log(user)

            if (user != null) {
                user_id = user.userId
            } else {
                ws.close(1011, "user is null.")
                return
            }

            if (user_id > 0) {
                findUserById(user_id).then(async value => {
                    let new_user_id = 'u' + user_id;
                    user_info = value
                    if (user_info === null) {
                        console.log(user_info)
                        ws.close(1011, "user is unfounded.")
                        return
                    }
                    await redisClient.connect()
                    await redisClient.set(new_user_id.toString(), "")
                    await redisClient.save()
                    await redisClient.disconnect()

                    users.push(new idWithWS(new_user_id.toString(), ws, true))
                    isUser = true
                    ws.send(`welcome ${new_user_id}`)
                })
            } else if (user_id < 0) {
                // pi 第一次連線
                let idStr = user_id.toString()
                idStr = idStr.split('-')[1]
                user_id = Number(idStr)
                findPiById(user_id).then(async value => {
                    let new_user_id = 'p' + user_id;
                    if (value != null) {
                        addPi(user_id, -1).then(pi => {
                            pi_info = pi
                        })
                    } else {
                        pi_info = value
                    }
                    await redisClient.connect()
                    await redisClient.set(new_user_id.toString(), "")
                    await redisClient.save()
                    await redisClient.disconnect()

                    users.push(new idWithWS(new_user_id.toString(), ws, false))
                    isUser = false
                    ws.send(`welcome ${new_user_id}`)
                })
            } else {
                console.log("else")
            }

        } catch (err: unknown) {
            if (err instanceof JsonWebTokenError) {
                ws.close(1011, `${err.message}`)
                return
            }
        }

        // const time = new Date()
        // for (let user of users) {
        //     // 傳給這次連線的人
        //     for (let others of users) {
        //         if (others != user) {
        //             others["ws"].send(`${time.toLocaleTimeString()} / ${user.name} join to the room.`)
        //         }
        //     }
            
        // }

        // 使用者傳訊息
        // ws收到訊息時執行 msg是使用者傳來的
        ws.on('message', async (msg: websocket.RawData) => {
            console.log(msg.toString())
            // console.log(checkIsValidateMessage(msg.toString()))
            if (!checkIsValidateMessage(msg.toString())) {
                if (user_id != 333) {
                    ws.send('not messages')
                } else {
                    ws.send(`@${user_id.toString()}`)
                }
                return
            }

            let { protocol, hostname, query } = url.parse(msg.toString(), true)

            if (protocol === "app:") {
                if (!redisClient.isOpen) {
                    await redisClient.connect()
                }
                console.log(hostname)
                if (hostname === "startrec") {
                    console.log("start recrec")
                    if (query.uuid && query.uuid != null) {
                        let pi = await redisClient.get(query.uuid.toString())
                        if (pi == null) {
                            ws.send("record: cannot found uuid")
                            return
                        } else {
                            console.log("oooooooh")
                            // 找特定的pi開始錄音
                            for (let user of users) {
                                if (user["id"] === query.uuid.toString()) {
                                    console.log(`start rec with ${query.uuid.toString()}`)
                                    user["ws"].send("pi://startRec?")
                                }
                            }
                        }
                        
                    }
                } else if (hostname === "stoprec") {
                    console.log("stop recrec")
                    if (query.uuid && query.uuid != null) {
                        let pi = await redisClient.get(query.uuid.toString())
                        if (pi == null) {
                            ws.send("record: cannot found uuid")
                            return
                        } else {
                            // 找特定的pi開始錄音
                            for (let user of users) {
                                if (user["id"] === query.uuid.toString()) {
                                    user["ws"].send("pi://stopRec?")
                                }
                            }
                        }
                        
                    }
                }
                if (redisClient.isOpen) {
                    await redisClient.disconnect()
                }

                if (hostname === "check") {
                    await redisClient.connect()
                    let k = await redisClient.keys('*')
                    ws.send(k)
                    await redisClient.disconnect()
                }
                // 當 protocol 為 app

                // user與樹莓派連線
                if (hostname === "connect") {
                    if (query.uuid) { 
                        if (typeof query.uuid === "string") {
                            if (!redisClient.isOpen) {
                                await redisClient.connect()
                            }

                            // 找PI
                            if (await redisClient.exists(query.uuid)) {
                                await redisClient.append(query.uuid, `@${user_id.toString()}`)
                            } else {
                                ws.send("error uuid")
                                return
                            }

                            // 找使用者
                            if (await redisClient.exists(user_id.toString())) {
                                await redisClient.append(user_id.toString(), `@${query.uuid}`)
                            } else {
                                await redisClient.set(user_id.toString(), query.uuid)
                            }
                        
                            let otherStr = await redisClient.get(user_id.toString())?? "" 
                            let othersPi = otherStr.split('@')
                            let ar: string[] = []
                            for (let user of users) {
                                if (othersPi.includes(user["id"])) {
                                    user["ws"].send(`id: ${user_id} connect with me.`)
                                    ar.push(user["id"])
                                }
                            }
                            ws.send(ar.join(" "))
                            await redisClient.save()

                            await redisClient.disconnect()
                        }
                    }
                    
                }

            } else if (protocol === "pi:") {
                // 當 protocol 為 pi
                if (hostname === "connect") {
                    await redisClient.connect()
                    let pi = await redisClient.exists(user_id.toString())
                    if (pi == null) {
                        await redisClient.set(user_id.toString(), '')
                        await redisClient.disconnect()
                    }
                } else if (hostname === "startRec" || hostname === "stopRec") {
                    // java自動執行
                }

            } else {
                for (let others of users) {
                    if (others['id'] != user_id.toString()) {
                        others["ws"].send(msg)
                    }
                }
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
        ws.on('close', async () => {
            let id = String(user_id)
            if (isUser) {
                id = 'u' + id
            } else {
                id = 'p' + id
            }
            for (let user of users) {
                let userId = user["id"]
                let userWs = user["ws"]

                if (userId != id) {
                    userWs.send(`${id} : LEFT`)
                }
            }
            users = users.filter((user) => user["id"] != id)
            if (!redisClient.isOpen) {
                await redisClient.connect()
            }
            await redisClient.del(id)
            if (redisClient.isOpen) {
                await redisClient.disconnect()
            }
        });
    });
}
