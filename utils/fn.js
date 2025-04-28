const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const DepartmentModel = require("../models/department.model");
const UserModel = require("../models/user.model");
const ChatModel = require("../models/chat.model");
const MessageModel = require("../models/message.model");
const {
  sendWhatsAppMessage,
  sendInteractiveMessage,
} = require("../services/whatsaap.service");
const dayjs = require("dayjs");

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
  const startIndex = page && size ? (+page - 1) * +size : 0;
  const endIndex = size ? startIndex + +size : array.length;
  const totalPages = Math.ceil(array?.length / +size);
  const docs = array?.slice(startIndex, endIndex);
  return {
    data: docs,
    pagination: {
      totalItems: array?.length,
      totalPages: totalPages,
      currentPage: +page,
      pageSize: +size,
    },
  };
};

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
  if (!path) return undefined;
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
  // Regex explained: https://regexr.com/58j0k
  const pathArray = Array.isArray(path) ? path : path.match(/([^[.\]])+/g);
  // Find value
  const result = pathArray.reduce(
    (prevObj, key) => prevObj && prevObj[key],
    obj
  );
  // If found value is undefined return default value; otherwise return the value
  console.log(result, "res");
  return result === undefined ? defValue : result;
};

exports.getCountA = async (Model, condition = null, aggregate = null) => {
  if (condition && !aggregate) {
    return await Model.countDocuments(condition);
  } else if (aggregate) {
    const merged = aggregate.reduce((r, c) => Object.assign(r, c), {});

    // let newAggregate = _.keys(merged).includes('$match') ? aggregate : [];
    let _keys = Object.keys;
    let _filter = (inp, fn) => inp.filter(fn);
    let newAggregate = _filter(
      aggregate,
      (a) => !["$sort", "$skip", "$limit"].includes(_keys(a).shift())
    );
    const count = await Model.aggregate(newAggregate).count("count");
    const result = _get(count, "[0].count", 0);
    return result;
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
  return new Promise((resolve) => setTimeout(resolve, ms));
};

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
};

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
  const words = inputString.toLowerCase().split(" ");

  // Capitalize the first letter of each word
  const capitalizedWords = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1)
  );

  // Join the words with a space
  const result = capitalizedWords.join(" ");

  return result;
};

exports.generateResourceId = async (length = 40) => {
  let result = "";
  const characters = "0123456789abcdefghijjklmnopqrstuv";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

exports.cleanJson = async (jsonString) => {
  // Remove unexpected line breaks
  jsonString = jsonString.replace(/(\r\n|\n|\r)/gm, " ");

  // Replace certain problematic patterns, such as missing commas, with regex
  // Note: Be careful; regex for JSON can be tricky and error-prone.
  // Below are examples; you may need custom rules for your specific API:

  // Example: Adding missing commas before keys, if found between braces
  jsonString = jsonString.replace(/}\s*{/g, "},{");

  // Attempt JSON parsing again after adjustments
  try {
    return jsonString;
  } catch (error) {
    console.error("Final JSON parsing failed after cleaning.");
    return null; // Return null or handle the error appropriately
  }
};

exports.extractTextFromFile = async (file) => {
  console.log("file in extract", file);

  const mimeType = file.mimetype;
  console.log("mimeType", mimeType);

  if (mimeType === "text/plain") {
    var data = fs.readFileSync(file.path, "utf8");
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
const fetchDepartmentsAndPrompts = async () => {
  try {
    const departments = await DepartmentModel.find().lean();
    return departments;
  } catch (error) {
    console.error("Error fetching departments and prompts:", error);
    throw error;
  }
};
exports.sendMessageToAdmins = async (socketObj, message, department, extraReceiver, sendUpdate, messageToExtr = true) => {
  try {
    const newMessage = new MessageModel(message);
    const latestMess = await newMessage.save();
    let extraUserIds = [];
    const conditions = [
      { role: { $in: ["Admin", "Supervisor"] } },
    ]
    if (department) {
      conditions.push({ department: department })
    }
    const oldChatDetails = await ChatModel.findOne({ _id: message?.chatId }).populate("latestMessage").lean();
    if (extraReceiver?.length > 0) {
      conditions.push(...extraReceiver)
      const extraUsers = await UserModel.find(...extraReceiver).lean();
      extraUserIds = extraUsers.map((user) => user._id?.toString());
    }
    const receivers = await UserModel.find({
      $or: conditions,
    }).lean();
    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: message?.chatId },
      { latestMessage: latestMess?._id, status: "active" },
      { new: true }
    )
      .populate("adminId customerId")
      .lean();
    // const UnReadCounts = await ChatModel.aggregate([
    //   {
    //     $lookup: {
    //       from: "messages",
    //       localField: "latestMessage",
    //       foreignField: "_id",
    //       as: "latestMessage",
    //     }
    //   },
    //   {
    //     $match: {
    //       "latestMessage.isSeen": false,
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       totalUnread: { $sum: 1 }
    //     }
    //   }
    // ]);
    [...receivers].forEach((receiver) => {
      sendUpdate && socketObj.io.to(receiver._id?.toString()).emit("update-chat", { ...updatedChat, latestMessage: latestMess });
      (messageToExtr || !extraUserIds?.includes(receiver._id?.toString())) && socketObj.io
        .to(receiver._id?.toString())
        .emit("message", { ...updatedChat, latestMessage: latestMess });
      oldChatDetails?.latestMessage?.isSeen && (messageToExtr || !extraUserIds?.includes(receiver._id?.toString())) && socketObj.io
        .to(receiver._id?.toString())
        .emit("unread-count", { chatId: updatedChat?._id?.toString(), isSeen: false });
    });
    return latestMess;
  } catch (error) {
    console.error("Error sending message to admins:", error);
    throw error;
  }
};
exports.sendMessageToUser = async (socketObj, message) => {
  try {

    console.log(message, "sendMessageToUser message");

    // const newMessage = new MessageModel(message);
    const latestMess = message;
    // const conditions = [
    //   { role: { $in: ["Admin", "Supervisor"] } },
    // ]
    // if(department){
    //   conditions.push({ department: department })
    // }
    // const receivers = await UserModel.find({
    //   $or: conditions,
    // }).lean();
    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: message?.chatId },
      { latestMessage: latestMess?._id, status: "active" },
      { new: true }
    )
      .populate("adminId customerId")
      .lean();
    socketObj.io
      .to(updatedChat?.customerId?._id?.toString())
      .emit("message", { ...updatedChat, latestMessage: latestMess });
    // [...receivers].forEach((receiver) => {

    // });
  } catch (error) {
    console.error("Error sending message to admins:", error);
    throw error;
  }
};

exports.checkDepartmentAvailability = async (
  existingChat
) => {
  try {
    const currentDay = new Date().getDay();
    console.log(currentDay, "currentDay");
    const daySchedule = existingChat?.department?.workingHours[`${currentDay}`];
    const holidays = existingChat?.department?.holidays;
    let isTodayHoliday = false;
    if (holidays?.length > 0) {
      isTodayHoliday = holidays.some((holiday) => dayjs(holiday?.start).isBefore(dayjs()) && dayjs(holiday?.end).isAfter(dayjs()));
    }

    if (isTodayHoliday) {
      return existingChat?.department?.messages?.afterHoursResponse;
    }

    if (daySchedule?.isAvailable) {
      // Get the current hour in the server's local time zone

      // const currentHour = Number(
      //   new Date().toLocaleString("en-US", {
      //     timeZone: "Asia/Kolkata",
      //     hour: "2-digit",
      //     hour12: false,
      //   })
      // );

      const currentHour = new Date().getHours();
      console.log(currentDay, daySchedule, "currentDay");
      const startHour = parseInt(
        daySchedule?.startTime.split(":")[0]
      );
      const endHour = parseInt(
        daySchedule?.endTime.split(":")[0]
      );

      console.log(currentHour, "currentHour");
      console.log(startHour, "startHour");
      console.log(endHour, "endHour");

      if (currentHour < startHour || currentHour > endHour) {
        // const message = {
        //   chatId: existingChat?._id,
        //   sender: null,
        //   receiver: existingChat.customerId?.toString(),
        //   sendType: "assistant",
        //   receiverType: "user",
        //   content: existingChat?.department?.messages?.afterHoursResponse,
        // };
        // exports.sendMessageToAdmins(
        //   socketObj,
        //   message,
        //   existingChat?.department?._id
        // );
        // await sendWhatsAppMessage(
        //   messageSender,
        //   undefined,
        //   undefined,
        //   undefined,
        //   existingChat?.department?.messages?.afterHoursResponse
        // );
        return existingChat?.department?.messages?.afterHoursResponse;
      }
    }
    else {
      return existingChat?.department?.messages?.afterHoursResponse;
    }
    return "True";
  } catch (error) {
    console.error("Error checking department availability:", error);
    throw error;
  }
};

exports.getAssigneeAgent = async (department, isOnline) => {
  try {
    console.log(department, "department in fun");

    const result = await UserModel.aggregate([
      // Step 1: Match agents based on the department
      { $match: { department: department, role: "Agent", ...(isOnline ? { isOnline: true } : {}) } },

      // Step 2: Join with the 'Chat' collection to count chats per agent
      {
        $lookup: {
          from: "chats", // The collection to join with
          localField: "_id", // Field from the 'Agent' collection to match
          foreignField: "adminId", // Field from the 'Chat' collection to match
          as: "chats", // Alias for the joined chats
        },
      },

      // Step 3: Add a new field 'chatCount' that counts the number of chats for each agent
      {
        $addFields: {
          chatCount: { $size: "$chats" },
        },
      },
    ]);
    console.log(result, "resultresultresult");

    if (result?.length > 0) {
      let finalAgent = result[0];
      result.map((agent) => {
        if (agent?.chatCount < finalAgent?.chatCount) {
          finalAgent = agent;
        }
      });
      return finalAgent;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting assignee agent:", error);
    throw error;
  }
};

exports.sendInterectiveMessageConfirmation = async (
  socketObj,
  existingChat,
  messageSender,
  messageID,
  noCondition
) => {
  try {
    if (!existingChat?.department || noCondition) {
      const departments = await fetchDepartmentsAndPrompts();
      console.log(departments, "departments");

      const interectiveMessageDetails = {
        options: departments,
        headerText: "Insurance Options",
        bodyText:
          "Hello! 👋 How can I assist you today with your insurance needs? Please select a department:",
        actionButtonText: "Select Department",
        actionSectionTitle: "Departments",
      };
      const message = {
        chatId: existingChat?._id?.toString(),
        sender: null,
        receiver: existingChat?.customerId?.toString(),
        sendType: "assistant",
        receiverType: "user",
        content:
          "Hello! 👋 How can I assist you today with your insurance needs? Please select a department:",
        messageType: "interective",
        messageOptions: departments?.map((department) => ({
          label: department.name,
          value: department._id,
        })),
      };

      sendInteractiveMessage(
        messageSender,
        messageID,
        interectiveMessageDetails
      );

      exports.sendMessageToAdmins(socketObj, message, null);

      return false;
    }
    return true;
  } catch (error) {
    throw error;
  }
};
exports.sendInterectiveMessageReSelectDepartment = async (
  socketObj,
  existingChat,
  messageSender,
  messageID
) => {
  try {

    const interectiveMessageDetails = {
      options: departments,
      headerText: "Insurance Options",
      bodyText:
        "Hello! 👋 How can I assist you today with your insurance needs? Please select a department:",
      actionButtonText: "Select Department",
      actionSectionTitle: "Departments",
    };
    const message = {
      chatId: existingChat?._id?.toString(),
      sender: null,
      receiver: existingChat?.customerId?.toString(),
      sendType: "assistant",
      receiverType: "user",
      content:
        "Hello! 👋 How can I assist you today with your insurance needs? Please select a department:",
      messageType: "interective",
      messageOptions: departments?.map((department) => ({
        label: department.name,
        value: department._id,
      })),
    };

    sendInteractiveMessage(
      messageSender,
      messageID,
      interectiveMessageDetails
    );

    exports.sendMessageToAdmins(socketObj, message, null);

    return false;
    // }
    // return true;
  } catch (error) {
    throw error;
  }
};

const imagesFormat = ["jpg", "jpeg", "png", "gif", "svg", "webp"];
exports.isImageType = (attachment) =>
  imagesFormat.some((format) => attachment?.toLowerCase?.().endsWith?.(format));


exports.getNextSubDeptId = (deptId) => {
  const ids = deptId?.split('-');
  let subDeptId = "";
  if (ids?.length > 0) {
    subDeptId = ids[ids.length - 1];
  }
  console.log(subDeptId.charCodeAt(0), "subDeptId");
  if (subDeptId.charCodeAt(0) >= 90) {
    return false;
  }
  const nextSubDeptId = subDeptId.charCodeAt(0) + 1;
  console.log(nextSubDeptId, "nextSubDeptId");

  return `${ids[0]}-${String.fromCharCode(nextSubDeptId)}`;
}