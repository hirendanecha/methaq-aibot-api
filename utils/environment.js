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
    pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX_NAME,
        sharedSecret: process.env.SHARED_SECRET,
    },
    s3bucket: {
        public: process.env.S3_PUBLIC_BUCKET,
        iamUserKey: process.env.IAM_USER_KEY,
        iamUserSecret: process.env.IAM_USER_SECRET,
        region: process.env.S3_REGION,
    },
    whatsaap:{
        whatVt:process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN,
        whatAt:process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN
    }
};
