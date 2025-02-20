const fs = require("fs");
const path = require("path");

const files = {
  deleteFileByUrl: (fileUrl) => {

    return new Promise((resolve, reject) => {
      if (!fileUrl) {
        return reject(new Error("File URL is required"));
      }

      try {
        // Parse the URL to get the pathname
        const parsedUrl = new URL(fileUrl);
        const pathname = parsedUrl.pathname;

        // Construct the full file path
        const filePath = path.join(__dirname, "..", pathname);

        // Check if the file exists and delete it
        fs.unlink(filePath, (err) => {
          if (err) {
            return reject(
              new Error(`Error deleting file: ${filePath} - ${err.message}`)
            );
          }

          resolve(`File deleted successfully: ${filePath}`);
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  deleteFileByPath: (filePath) => {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        return reject(new Error("File URL is required"));
      }

      try {
        // Construct the full file path
        const serverFilePath = path.join(__dirname, "../public", filePath);

        // Check if the file exists and delete it
        fs.unlink(serverFilePath, (err) => {
          if (err) {
            return reject(
              new Error(
                `Error deleting file: ${serverFilePath} - ${err.message}`
              )
            );
          }

          resolve(`File deleted successfully: ${serverFilePath}`);
        });
      } catch (error) {
        reject(error);
      }
    });
  },
};

module.exports = files;
