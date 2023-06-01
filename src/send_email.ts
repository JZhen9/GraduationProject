import nodemailer from "nodemailer"
import { google } from "googleapis"
import { User } from "./database/entity/user.entity"

const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI)
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN })

export async function sendMail(id: string, email: string) {
    try {
        const accessToken = await oAuth2Client.getAccessToken()
        if (accessToken.token == null) {
            return
        }

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.USER_MAIL,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken.token
            }
        })

        const mailOptions = {
            from: `<${process.env.USER_MAIL}>`,
            to: email,
            subject: '居家監控信箱驗證',
            text: '居家監控信箱驗證',
            html: '<b>點選 <a href="http://localhost:3030/auth/' + id + '">連結</a> 以進行驗證</b>'
        }

        const result = await transport.sendMail(mailOptions)
        return result
    } catch ( error ) {
        return error
    }
}

// sendMail()
// .then(result => console.log('Email Sent...', result))
// .catch((error) => console.log('Error: ', error))