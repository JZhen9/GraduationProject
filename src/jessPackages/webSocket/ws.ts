// webSocket
import websocket, { WebSocket } from 'ws'
import { IncomingMessage } from 'http'
// JWT
import jwtTool from "../../tools/jwtTool"
import { JsonWebTokenError } from 'jsonwebtoken'
// UUID
import { stringify, v4 as uuidv4 } from 'uuid'
// jessPackages
import checkIsValidateURL from "../../jessPackages/checkURL"
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

export function connectWS(wsRoute: websocket.Server<websocket.WebSocket>, redisClient: RedisClientType<{
    graph: {
        CONFIG_GET: typeof import("/home/lab517/Documents/graduationBackEnd/node_modules/@redis/graph/dist/commands/CONFIG_GET");
        configGet: typeof import("/home/lab517/Documents/graduationBackEnd/node_modules/@redis/graph/dist/commands/CONFIG_GET");
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
        slowLog: typeof import("/home/lab517/Documents/graduationBackEnd/node_modules/@redis/graph/dist/commands/SLOWLOG");
    };
} & RedisModules, RedisFunctions, RedisScripts>) {
    let users: idWithWS[] = []
    wsRoute.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        let user_id: number = Number.NaN
        let user_info: User | null = null
        let pi_info: RaspberryPi | null = null
        
        if (req.headers.token == undefined || req.headers.token == null || req.headers.token.length == 0) {
            ws.close(1011, "token is undefined or null.")
            return
        }
        try {
            let user = jwtTool.verifyToken(req.headers.token as string)

            if (user != null) {
                user_id = user.userId
            } else {
                ws.close(1011, "user is null.")
                return
            }

            if (user_id > 0) {
                findUserById(user_id).then(value => {
                    user_info = value
                    if (user_info == null) {
                        console.log(user_info)
                        ws.close(1011, "user is unfounded.")
                        return
                    }
                    users.push(new idWithWS(user_id.toString(), ws))
                })
            } else if (user_id < 0) {
                let idStr = user_id.toString()
                idStr = idStr.split('-')[1]
                user_id = Number(idStr)
                findPiById(user_id).then(value => {
                    if (value != null) {
                        addPi(user_id, -1).then(pi => {
                            pi_info = pi
                        })
                    } else {
                        pi_info = value
                    }
                    users.push(new idWithWS(user_id.toString(), ws))
                })
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
            if (!checkIsValidateURL(msg.toString())) {
                ws.send('not messages')
                return
            }

            let { protocol, hostname, query } = url.parse(msg.toString(), true)

            if (protocol === "app:") {

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
                            let others = otherStr.split('@')
                            let ar: string[] = []
                            for (let other of users) {
                                if (others.includes(other["id"])) {
                                    other["ws"].send(`id: ${user_id} connect with me.`)
                                    ar.push(other["id"])
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
                    await redisClient.set(user_id.toString(), '')
                    await redisClient.save()
                    await redisClient.disconnect()
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
            for (let user of users) {
                let userId = user["id"]
                let userWs = user["ws"]

                if (userId != id) {
                    userWs.send(`${id} : LEFT`)
                }
            }
            users = users.filter((user) => user["id"] != id)
            await redisClient.connect()
            await redisClient.del(id)
            await redisClient.disconnect()
        });
    });
}