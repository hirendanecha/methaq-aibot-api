const axios = require("axios");
const environment = require("../utils/environment");
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const OCR = {
    async checkCarRegistrationCard(files) {
        try {
            const formData = new FormData();

            // Check if files is an array and has items
            // if (Array.isArray(files) && files.length > 0) {
            //     files.forEach((file, index) => {
            //         // If file is a path string
            //         if (typeof file === 'string') {
            //             formData.append('files', fs.createReadStream(file));
            //         } 
            //         // If file is a File object or Buffer
            //         else {
            //             formData.append('files', file);
            //         }
            //     });
            // }

            for (const file of files) {
                const fullPath = path.resolve(file.path);

                formData.append('files', fs.createReadStream(fullPath), {
                    filename: file.originalname,
                    contentType: file.mimetype
                });
            }

            try {
                const response = await axios.post(`${environment.carDetectionOcrApi}/car-detection`, formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                return response.data;
            } catch (error) {
                return error.response.data;
            }

        } catch (error) {
            console.log(error, "error");
            return error.message
        }
    },

    async checkDrivingLicense(files) {
        try {
            const formData = new FormData();

            for (const file of files) {
                const fullPath = path.resolve(file.path);

                formData.append('files', fs.createReadStream(fullPath), {
                    filename: file.originalname,
                    contentType: file.mimetype
                });
            }

            try {
                const response = await axios.post(`${environment.carDetectionOcrApi}/driving-detection`, formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                return response.data;
            } catch (error) {
                return error.response.data;
            }

        } catch (error) {
            console.log(error, "error");
            return error.message
        }
    },

    async checkEmirates(files) {
        try {
            const formData = new FormData();

            for (const file of files) {
                const fullPath = path.resolve(file.path);

                formData.append('files', fs.createReadStream(fullPath), {
                    filename: file.originalname,
                    contentType: file.mimetype
                });
            }

            try {
                const response = await axios.post(`${environment.carDetectionOcrApi}/EmiratesIDCard-detection`, formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                return response.data;
            } catch (error) {
                return error.response.data;
            }

        } catch (error) {
            console.log(error, "error");
            return error.message
        }
    },
};

module.exports = OCR;