exports.sendSuccessResponse = (res, message = "Success", status = 200, flag = true) => {
    const response = { ...(typeof message === 'object' ? message : { message }) };
    return res.status(status)
        .json({ ...(flag ? { success: true } : {}), ...response })
}

exports.sendActualErrorResponse = (res, message = "Internal Server Error", status = 500, flag = true) => {
    const response = { ...(typeof message === 'object' ? message : { message }) };
    return res.status(status)
        .json({ ...(flag ? { success: false } : {}), ...response })
}

exports.sendErrorResponse = (res, message = "Internal Server Error", status = 500, flag = true, customError = false) => {
    let response;
    if (customError === true) {
        response = { ...(typeof message === 'object' ? message : { message }) };
    } else {
        const errMessage = {
            message: "An error occurred. Please contact support or try again later.",
            actualMessage: message
        };
        response = errMessage;
    }
    return res.status(status)
        .json({ ...(flag ? { success: false } : {}), ...response })
}