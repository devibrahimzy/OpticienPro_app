const { registerUser } = require('./auth'); // adjust path
const username = 'brahim';
const password = '123';
const fullName = 'Administrator';

registerUser(username, password, fullName);
