require("dotenv").config();

module.exports = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    server: process.env.SERVER,
    domain: process.env.DOMAIN,
    database: {
        uri: process.env.DB_URI,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiredIn: process.env.JWT_EXPIRED_IN,
    },
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        senderEmail: process.env.ADMIN_EMAIL,
        senderName: process.env.ADMIN_NAME,
        senders: {
            primary: {
                email: process.env.ADMIN_EMAIL,
                name: process.env.ADMIN_NAME,
            },
            cls: {
                email: process.env.SG_SENDER_CLS_EMAIL,
                name: process.env.SG_SENDER_CLS_NAME,
            },
        },
    },
    carDetectionOcrApi: process.env.CAR_DETECTION_OCR_API,
    openaiApiKey: process.env.OPENAI_API_KEY,
};
