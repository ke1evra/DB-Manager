var mysql   = require("mysql");

var pool = mysql.createPool({
    connectionLimit : 10,
    host     : '89.208.155.73',
    user     : 'ec-crm-ro',
    password : 'xqCNVHLT3y3HtYv6lYxSjH7c'
});


var DB = (function () {

    function _query(query, params, callback) {
        pool.getConnection(function (err, connection) {
            if (err) {
                connection.release();
                callback(null, err);
                // throw err;
                console.log(err)
            }

            connection.query(query, params, function (err, rows) {
                connection.release();
                if (!err) {
                    callback(rows);
                }
                else {
                    callback(null, err);
                }
            });

            connection.on('error', function (err) {
                connection.release();
                callback(null, err);
                // throw err;
                console.log(err)
            });
        });
    };

    return {
        query: _query
    };
})();

module.exports = DB;
