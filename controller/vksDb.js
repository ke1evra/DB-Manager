const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: '89.208.155.73',
    user: 'ec-crm-ro',
    password: 'xqCNVHLT3y3HtYv6lYxSjH7c',
});


const DB = (function () {
// eslint-disable-next-line no-underscore-dangle
    function _query(query, params, callback) {
        pool.getConnection((err, connection) => {
            if (err) {
                connection.release();
                callback(null, err);
                // throw err;
                console.log(err);
            }

            connection.query(query, params, (err, rows) => {
                connection.release();
                if (!err) {
                    callback(rows);
                } else {
                    callback(null, err);
                }
            });

            connection.on('error', (err) => {
                connection.release();
                callback(null, err);
                // throw err;
                console.log(err);
            });
        });
    }

    return {
        query: _query,
    };
}());

module.exports = DB;
