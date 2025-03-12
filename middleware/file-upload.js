const multer = require("multer");
const fs = require("fs");
const dayjs = require("dayjs");

const mimeTypes = (mediaType) => {
  switch (mediaType) {
    case "image":
      return [
        "image/bmp",
        "image/gif",
        "image/ief",
        "image/jpeg",
        "image/pipeg",
        "image/tiff",
        "image/svg+xml",
        "image/png",
        "image/ico",
      ];
    case "audio":
      return [
        "audio/basic",
        "audio/mid",
        "audio/mpeg",
        "audio/mp3",
        "audio/x-mpegurl",
        "audio/x-pn-realaudio",
        "audio/x-wav",
        "audio/x-pn-realaudio",
        "audio/x-aiff",
      ];
    case "video":
      return [
        "video/mpeg",
        "video/mp4",
        "video/quicktime",
        "video/x-la-asf",
        "video/x-ms-asf",
        "video/x-msvideo",
        "video/x-sgi-movie",
      ];
    case "pdf":
      return ["application/pdf"];
    case "json":
      return ["application/json"]
    case "csv":
      return ["application/vnd.ms-excel", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    case "text":
      return ["text/plain"];
    case "excel":
      return [
        "application/vnd.ms-excel", // XLS
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
      ];
    case "word":
      return [
        "application/msword", // DOC
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
      ];

    default:
      return [];
  }
};

const dest = (path) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = `public/images/${path}/${dayjs().format("YYYY-MM")}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(
        null,
        new Date().getTime() + "-" + file.originalname.replace(/ +/g, "_")
      );
    },
  });
};

const fileFilter = (mimeTypeArray) => {
  const allowedMimes = mimeTypeArray.map((m) => mimeTypes(m));

  return (req, file, cb) => {
    if ([].concat.apply([], allowedMimes).includes(file.mimetype)) {
      cb(null, true);
    } else {
      req.fileValidationError = "invalid mime type";
      cb(null, false, new Error("invalid mime type"));
    }
  };
};

/**
 *
 * Fields
 * @typedef {Object} Fields
 * @property {String} name - request key name
 * @property {Number} maxCount - maximum file count for upload
 *
 */

/**
 *
 * File Upload
 *
 * @param { String } destination - directory name
 * @param { String[] } mimeFilter - mimeFilter Array
 * @param { Fields[] } fields - Multiple Fields
 *
 * @example
 *  fileUpload('profile', ["image"], [{ name: "image", maxCount: 1 }])
 */
exports.fileUpload = (destination, mimeTypesArray, fields) => {
  return multer({
    storage: dest(destination),
    fileFilter: fileFilter(mimeTypesArray),
  }).fields(fields);
};
