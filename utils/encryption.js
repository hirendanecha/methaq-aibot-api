const crypto = require('crypto');

// Function to generate a random key as a string
exports.generateKey = () => {
  return crypto.randomBytes(32).toString('hex'); // 256 bits
}

// Function to encrypt a message
exports.encryptMessage = async (message, key) => {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(message, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return { iv: iv.toString('hex'), encryptedMessage: encrypted };
}

// Function to decrypt a message
exports.decryptMessage = async (encryptedMessage, key, iv) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedMessage, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

exports.uaePass = {
  encrypt: (text, secret) => {
    const cipher = crypto.createCipheriv(
      "aes-256-ecb",
      Buffer.from(secret),
      null
    );
    let encrypted = cipher.update(text, "utf-8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  },
  decrypt: (text, secret) => {
    const decipher = crypto.createDecipheriv(
      "aes-256-ecb",
      Buffer.from(secret),
      null
    );
    let decrypted = decipher.update(text, "base64", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  },
  calculateHmacSha256: (secretKey, data) => {
    const hmac = crypto.createHmac("sha256", secretKey);
    hmac.update(data);
    const hash = hmac.digest("hex");
    return hash;
  },
  encodeToBase64: (str) => {
    return Buffer.from(str).toString("base64");
  },
  decodeBase64: (str) => {
    return Buffer.from(str, "base64").toString("utf-8");
  },
  sha256Hash: (data) => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }
};

exports.encryptAES = (sSrc, secret) => {
  const cipher = crypto.createCipheriv(
    "aes-256-ecb",
    Buffer.from(secret),
    null
  );
  let encrypted = cipher.update(sSrc, "utf-8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};

exports.decryptAES = (sSrc, secret) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-ecb",
    Buffer.from(secret),
    null
  );
  let decrypted = decipher.update(sSrc, "base64", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
};
