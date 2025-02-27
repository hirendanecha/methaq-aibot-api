const fs = require("fs");
const AWS = require("aws-sdk");
const path = require("path");
const environment = require("../utils/environment");

const s3bucket = new AWS.S3({
    accessKeyId: environment.s3bucket.iamUserKey,
    secretAccessKey: environment.s3bucket.iamUserSecret,
    region: environment.s3bucket.region,
});

const s3 = {
    uploadPrivate: (file, fileName, folder = "folderName") => {
        return new Promise((resolve, reject) => {
            try {
                const readStream = fs.createReadStream(file);

                const params = {
                    Bucket: environment.s3bucket.private,
                    Key: `${folder}/${fileName}`,
                    Body: readStream,
                    ACL: "bucket-owner-full-control",
                };

                s3bucket.upload(params, (err, data) => {
                    readStream.destroy();
                    fs.unlinkSync(file);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data.Location);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    uploadPublic: (file, fileName, folder = "folderName") => {
        return new Promise((resolve, reject) => {
            try {
                const readStream = fs.createReadStream(file);

                const params = {
                    Bucket: environment.s3bucket.public,
                    Key: `${folder}/${fileName}`,
                    Body: readStream,
                    ACL: "bucket-owner-full-control",
                };

                s3bucket.upload(params, (err, data) => {
                    readStream.destroy();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data.Location);
                    }
                    fs.unlinkSync(file);
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    deleteFiles: (files) => {
        return new Promise((resolve, reject) => {
            try {
                console.log(files);
                const params = {
                    Bucket: environment.s3bucket.public,
                    Delete: {
                        Objects: files.flat().map((item) => {
                            let key = new URL(item);
                            return { Key: key.pathname.split("/").splice(1).join("/") };
                        }),
                    },
                };
                console.log("param =< ", params.Delete.Objects);
                if (params.Delete.Objects.length > 0) {
                    s3bucket.deleteObjects(params, (err, data) => {
                        if (err) {
                            console.log("error from herre ==> ", err);
                            reject(err);
                        } else {
                            console.log(
                                `Successfully deleted ${params.Delete.Objects.length} objects.`
                            );
                            resolve(data);
                        }
                    });
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    deleteFolder: (bucketName, folderPaths) => {
        return new Promise(async (resolve, reject) => {
            try {
                for (const folderPath of folderPaths) {
                    const listParams = {
                        Bucket: bucketName,
                        Prefix: folderPath,
                    };

                    const listedObjects = await s3bucket
                        .listObjectsV2(listParams)
                        .promise();

                    if (listedObjects.Contents.length === 0) {
                        continue;
                    }

                    console.log("outside if");

                    const deleteParams = {
                        Bucket: bucketName,
                        Delete: { Objects: [] },
                    };

                    listedObjects.Contents.forEach(({ Key }) => {
                        deleteParams.Delete.Objects.push({ Key });
                    });

                    await s3bucket.deleteObjects(deleteParams).promise();

                    await s3bucket
                        .deleteObject({ Bucket: bucketName, Key: folderPath })
                        .promise();

                    console.log(
                        `Folder ${folderPath} and its contents deleted successfully!`
                    );
                }

                resolve("All folders and their contents deleted successfully!");
            } catch (err) {
                reject(err);
            }
        });
    },

    copyFile: (type, url, folder = "posts", fromPrivate, toPrivate) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (type == "image") {
                    console.log(url);
                    let keyValue = new URL(url);
                    const m3u8Key = keyValue.pathname.split("/").splice(1).join("/");
                    const destination_m3u8Key =
                        folder + "/" + keyValue.pathname.split("/").splice(2).join("/");

                    const fromBucket = fromPrivate
                        ? environment.s3bucket.private
                        : environment.s3bucket.public;
                    const toBucket = toPrivate
                        ? environment.s3bucket.private
                        : environment.s3bucket.public;

                    const params = {
                        Bucket: toBucket,
                        CopySource: `${fromBucket}/${m3u8Key}`,
                        Key: `${destination_m3u8Key}`,
                    };

                    s3bucket.copyObject(params, function (copyErr, copyData) {
                        if (copyErr) {
                            reject(copyErr);
                        }
                        if (copyData) {
                            const bucketName = toBucket;
                            const region = environment.s3bucket.region;

                            attachmentsUrl = `https://${bucketName}${region}.s3.amazonaws.com/${destination_m3u8Key}`;
                            resolve(attachmentsUrl);
                        }
                    });
                    // .promise();
                    // .then((copyData) => {
                    //   console.log(copyData);
                    // })
                    // .catch((copyErr) => console.log(copyErr));
                } else {
                    const videoAttachment = [];
                    let keyValue = new URL(url);
                    var m3u8Key = keyValue.pathname.split("/").splice(1);
                    const endPoint = m3u8Key.pop();
                    var resolveURL = "";
                    m3u8Key = m3u8Key.join("/");
                    const destination_m3u8Key =
                        folder + "/" + m3u8Key.split("/").splice(1).join("/");
                    m3u8Key = m3u8Key + "/";
                    console.log(m3u8Key);
                    console.log(destination_m3u8Key);

                    const fromBucket = fromPrivate
                        ? environment.s3bucket.private
                        : environment.s3bucket.public;
                    const toBucket = toPrivate
                        ? environment.s3bucket.private
                        : environment.s3bucket.public;

                    const listObjectsResponse = await s3bucket
                        .listObjects({
                            Bucket: fromBucket,
                            Prefix: m3u8Key,
                            Delimiter: destination_m3u8Key,
                        })
                        .promise();

                    const folderContentInfo = listObjectsResponse.Contents;
                    const folderPrefix = listObjectsResponse.Prefix;

                    await Promise.all([
                        await folderContentInfo.map(async (fileInfo) => {
                            await s3bucket.copyObject(
                                {
                                    Bucket: toBucket,
                                    CopySource: `${fromBucket}/${fileInfo.Key}`, // old file Key
                                    Key: `${destination_m3u8Key}/${fileInfo.Key.replace(
                                        folderPrefix,
                                        ""
                                    )}`,
                                },
                                function (copyErr, copyData) {
                                    if (copyErr) {
                                        reject(copyErr);
                                    }
                                    if (copyData) {
                                        const bucketName = toBucket;
                                        const region = environment.s3bucket.region;

                                        const attachmentsUrl = `https://${bucketName}${region}.s3.amazonaws.com/${destination_m3u8Key}/${fileInfo.Key.split(
                                            "/"
                                        ).splice(-1)}`;
                                        console.log("attachmentsUrl-", attachmentsUrl);

                                        if (path.extname(attachmentsUrl) == ".m3u8") {
                                            resolve(attachmentsUrl);
                                        }
                                    }
                                }
                            );
                        }),
                    ])
                        .then(() => { })
                        .catch((e) => reject(e));
                }
            } catch (error) {
                console.log(error?.message);
            }
        });
    },

    getPrivateFiles: (key) => {
        return new Promise((resolve, reject) => {
            try {
                // console.log("key ", key);
                let keyValue = new URL(key);
                const params = {
                    Bucket: environment.s3bucket.private,
                    Key: keyValue.pathname.split("/").splice(1).join("/"),
                    Expires: 5000,
                };

                s3bucket.getSignedUrl("getObject", params, (err, url) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    resolve(url);
                    return url;
                });
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    },

    getFiles: (key, bucketname) => {
        return new Promise((resolve, reject) => {
            try {
                const params = {
                    Bucket: bucketname,
                    Key: key,
                    Expires: 60,
                };

                s3bucket.getSignedUrl("getObject", params, (err, url) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log("this is url ==> ", url);
                    resolve(url);
                    return url;
                });
            } catch (error) {
                reject(error);
            }
        });
    },

}

module.exports = s3;
