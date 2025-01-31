const jwt = require("jsonwebtoken");
const environment = require("../utils/environment");
const { sendErrorResponse } = require("../utils/response");


module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = (authHeader && authHeader.split(' ')[1]) || (req.cookies['token'] || '');
        if (!token) {
            return sendErrorResponse(res, 'Unauthorized Access', 401, true, true);
        } else {
            let decoded = jwt.decode(token);
            jwt.verify(token, environment.jwt.secret, async (err, user) => {
                if (err) {
                    return sendErrorResponse(res, 'You have been logged out, please login again', 401, true, true);
                }
                req.user = decoded;
                next();
            })
        }
    } catch (error) {
        sendErrorResponse(res, 'Unauthorized Access', 401);
    }
}