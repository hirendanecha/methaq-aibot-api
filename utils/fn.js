const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");


const baseUrl = "";
exports.removeFile = (fileName) => {
  return new Promise((resolve, reject) => {
    fs.unlink(path.join(baseUrl, fileName), (err) => {
      if (err) {
        console.error(`Error deleting file: ${err.message}`);
        reject(err);
      } else {
        console.log(`File ${fileName} deleted successfully`);
        resolve(fileName);
      }
    });
  });
};

exports.paginatedArray = (array, size = 10, page = 1) => {
  const startIndex = (page && size) ? ((+page - 1) * +size) : 0;
  const endIndex = size ? startIndex + +size : array.length;
  const totalPages = Math.ceil(array?.length / +size);
  const docs = array?.slice(startIndex, endIndex);
  return {
    data: docs,
    pagination: {
      totalItems: array?.length,
      totalPages: totalPages,
      currentPage: +page,
      pageSize: +size
    }
  }
}

exports.getPagination = (page, size) => {
  const limit = size ? +size : 10;
  const offset = page ? (page - 1) * limit : 0;

  return { limit, offset };
};

exports.getPaginationData = (data, page, limit) => {
  const { count: totalItems, docs } = data;
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(totalItems / limit);
  return {
    data: docs,
    ...(limit
      ? { pagination: { totalItems, totalPages, currentPage, pageSize: limit } }
      : {}),
  };
};

exports.getCount = async (Model, condition = null) => {
  if (condition) {
    return await Model.countDocuments(condition);
  }
  return await Model.estimatedDocumentCount();
};

const _get = (obj, path, defValue) => {
  // If path is not defined or it has false value
  if (!path) return undefined
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
  // Regex explained: https://regexr.com/58j0k
  const pathArray = Array.isArray(path) ? path : path.match(/([^[.\]])+/g)
  // Find value
  const result = pathArray.reduce(
    (prevObj, key) => prevObj && prevObj[key],
    obj
  )
  // If found value is undefined return default value; otherwise return the value
  console.log(result, "res");
  return result === undefined ? defValue : result
}

exports.getCountA = async (Model, condition = null, aggregate = null) => {
  if (condition && !aggregate) {
    return await Model.countDocuments(condition);
  } else if (aggregate) {
    const merged = aggregate.reduce((r, c) => Object.assign(r, c), {});

    // let newAggregate = _.keys(merged).includes('$match') ? aggregate : [];
    let _keys = Object.keys
    let _filter = (inp, fn) => inp.filter(fn)
    let newAggregate = _filter(
      aggregate,
      (a) => !["$sort", "$skip", "$limit"].includes(_keys(a).shift())
    );
    const count = await Model.aggregate(newAggregate).count("count");
    const result = _get(count, "[0].count", 0);
    return result
  } else {
    return await Model.estimatedDocumentCount();
  }
};

const randomNumber = (min, max) => {
  var random = Math.random();
  return Math.floor(random * (max - min) + min);
};

exports.randomNumber = randomNumber;

/**
 * Generate random string of the length
 * @param  {number} length length of string.
 * @param  {object} options
 * @param  {boolean} options.digits Default: `true` true value includes digits in output
 * @param  {boolean} options.alphabets Default: `true` true value includes alphabets in output
 * @param  {boolean} options.upperCase Default: `true` true value includes upperCase in output
 * @param  {boolean} options.specialChars Default: `false` true value includes specialChars in output
 */
exports.generateRandomString = (length = 12, options = {}) => {
  var generateOptions = options;

  var digits = "0123456789";
  var alphabets = "abcdefghijklmnopqrstuvwxyz";
  var upperCase = alphabets.toUpperCase();
  var specialChars = "#!&@";

  generateOptions.digits = generateOptions.hasOwnProperty("digits")
    ? options.digits
    : true;
  generateOptions.alphabets = generateOptions.hasOwnProperty("alphabets")
    ? options.alphabets
    : true;
  generateOptions.upperCase = generateOptions.hasOwnProperty("upperCase")
    ? options.upperCase
    : true;
  generateOptions.specialChars = generateOptions.hasOwnProperty("specialChars")
    ? options.specialChars
    : false;

  var allowsChars =
    ((generateOptions.digits || "") && digits) +
    ((generateOptions.alphabets || "") && alphabets) +
    ((generateOptions.upperCase || "") && upperCase) +
    ((generateOptions.specialChars || "") && specialChars);

  var output = "";
  for (var index = 0; index < length; ++index) {
    var charIndex = randomNumber(0, allowsChars.length - 1);
    output += allowsChars[charIndex];
  }
  return output;
};

exports.padStartZeroes = (number, len) => {
  return String(number).padStart(len, "0");
};

exports.isNumber = (number) => {
  return typeof number === "number";
};

exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.fileToBlob = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (error, data) => {
      if (error) {
        reject(error);
        return;
      }

      const blob = new Blob([data]);
      resolve(blob);
    });
  });
}

exports.formatNumber = (number) => {
  return new Intl.NumberFormat("ar-AE", {
    maximumFractionDigits: 2,
  }).format(number);
};

exports.formatNumberWithDecimal = (number) => {
  return new Intl.NumberFormat("ar-AE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(number);
};

exports.convertToProperCase = async (inputString) => {
  // Convert the input string to lowercase and split into words
  const words = inputString.toLowerCase().split(' ');

  // Capitalize the first letter of each word
  const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));

  // Join the words with a space
  const result = capitalizedWords.join(' ');

  return result;
}

exports.generateResourceId = async (length = 40) => {
  let result = '';
  const characters = '0123456789abcdefghijjklmnopqrstuv';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

exports.cleanJson = async (jsonString) => {
  // Remove unexpected line breaks
  jsonString = jsonString.replace(/(\r\n|\n|\r)/gm, " ");

  // Replace certain problematic patterns, such as missing commas, with regex
  // Note: Be careful; regex for JSON can be tricky and error-prone.
  // Below are examples; you may need custom rules for your specific API:

  // Example: Adding missing commas before keys, if found between braces
  jsonString = jsonString.replace(/}\s*{/g, '},{');

  // Attempt JSON parsing again after adjustments
  try {
    return jsonString;
  } catch (error) {
    console.error("Final JSON parsing failed after cleaning.");
    return null; // Return null or handle the error appropriately
  }
}

exports.extractTextFromFile = async (file) => {
  console.log("file in extract", file);

  const mimeType = file.mimetype;
  console.log("mimeType", mimeType);
  

  if (mimeType === "text/plain") {
    var data = fs.readFileSync(file.path, 'utf8');
    return data.toString();
  } else if (mimeType === "application/pdf") {
    const pdfData = await pdfParse(file.path);
    return pdfData.text;
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ path: file.path });
    return result.value;
  } else {
    throw new Error("Unsupported file type.");
  }
};