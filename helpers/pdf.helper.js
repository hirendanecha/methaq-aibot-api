const { renderFile } = require("ejs");
const { launch } = require("puppeteer");
const { writeFile, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { generateRandomString } = require("../utils/fn");
const environment = require("../utils/environment");

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
    // format: "A4",
    width: "190mm",
    height: "270mm",
  }
) => {
  return new Promise(async (resolve, reject) => {
    try {
     
      if (environment?.nodeEnv !== "production") {
        browser = await launch({
          headless: "new",
          // headless: true,
          args: ["--no-sandbox"],
        });
      } else {
        browser = await launch({
          executablePath: '/usr/bin/chromium-browser',
          headless: "new",
          // headless: true,
          args: ["--no-sandbox"],
        });
      }

      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36");

      let template = await renderFile(join(__dirname, templatePath), data, {
        async: true,
      });

      await page.setContent(template, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf(options);

      await browser.close();

      if (!filename) {
        filename = generateRandomString();
      }

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Ensure the directory exists before writing the file
      const filePath = `${dir}/${filename}.pdf`;
      writeFile(filePath, pdf, {}, (err) => {
        if (err) {
          return reject(err);
        }
        resolve({
          link: filePath,
          filename: `${filename}.pdf`,
        });
      });
    } catch (error) {
      console.log("Error: generatePDF =>", error);
      reject(error);
    }
  });
};

