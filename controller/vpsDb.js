const pgp = require('pg-promise')({
    // Initialization Options
});
// Preparing the connection details:
const cn = 'postgres://ko:97136842@185.176.25.157:5432/mango';
// Creating a new database instance from the connection details:
const db = pgp(cn);

module.exports = db;
