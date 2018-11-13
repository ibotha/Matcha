const crypto = require('crypto');
const hash = crypto.createHash('sha256');

hash.update('some data to has');
console.log(hash.digest('hex'));