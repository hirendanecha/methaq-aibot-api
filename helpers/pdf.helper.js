const { renderFile } = require("ejs");
const { launch } = require("puppeteer");
const { writeFile, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { generateRandomString } = require("../utils/fn");

/**
 *
 * @param {String} templatePath
 * @param {Object} data
 * @param {String} filename
 * @param {String} dir
 * @param {*} options
 * @returns {Promise<String>} PDfLocation
 *
 * ex. generatePDF('views/index.ejs', {title: 'PDF works!'})
 *
 * ex. generatePDF('views/index.ejs', {title: 'PDF works!'}, 'myCustomPDFName')
 *
 */

exports.generatePDF = (
  templatePath,
  data,
  filename,
  dir = "public/pdf",
  options = {
    printBackground: true,
    format: "A4",
  }
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await launch({
        headless: "new",
        args: ["--no-sandbox"],
      });
      const page = await browser.newPage();

      let template = await renderFile(join(__dirname, templatePath), data, {
        async: true,
      });

      await page.setContent(template);

      const pdf = await page.pdf(options);

      await browser.close();

      if (!filename) {
        filename = generateRandomString();
      }

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const filePath = `${dir}/${filename}.pdf`;

      writeFile(filePath, pdf, {}, (err) => {
        if (err) {
          return reject(err);
        }
        resolve({
          link: filePath.replace("public", ""),
          filename: `${filename}.pdf`,
        });
      });
    } catch (error) {
      console.log("Error: generatePDF =>", error);
      reject(error);
    }
  });
};
