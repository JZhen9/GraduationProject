import morgan from "morgan";
// colorful log(if export to file , take off)
import chalk from "chalk"
import { exportlogger } from "./loggerSettings";

export function setLoggingColor(status:Boolean = true){

    return status ? morgan(function (tokens, req, res) {
        let result = [
            tokens.date(req, res),
            // user's IP
            tokens['remote-addr'](req, res),
            // user's request method
            tokens.method(req, res),
            tokens.status(req, res),
            tokens['response-time'](req, res) + ' ms',
            tokens.url(req, res),
        ].join('  |  ')
        exportlogger.debug(result)
        return [
            chalk.hex('#f78fb3').bold(tokens.date(req, res)),
            // user's IP
            chalk.yellow(tokens['remote-addr'](req, res)),
            // user's request method
            chalk.hex('#34ace0').bold(tokens.method(req, res)).padStart(38),
            chalk.hex('#ffb142').bold(tokens.status(req, res)),
            chalk.hex('#2ed573').bold(tokens['response-time'](req, res) + ' ms').padStart(42),
            chalk.hex('#ff5252').bold(tokens.url(req, res)),
        ].join('  |  ')
    }) : morgan(function (tokens, req, res) {
        let result = [
            tokens.date(req, res),
            // user's IP
            tokens['remote-addr'](req, res),
            // user's request method
            tokens.method(req, res),
            tokens.status(req, res),
            tokens['response-time'](req, res) + ' ms',
            tokens.url(req, res),
        ].join('  |  ')
        exportlogger.debug(result)
        return result
    });
}