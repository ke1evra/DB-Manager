const pgp = require('pg-promise')({
    // Initialization Options
});
// Preparing the connection details:
const cn = 'postgres://ko:97136842@185.211.247.12:5432/mango';
// Creating a new database instance from the connection details:
const db = pgp(cn);

const dbInsert = (values, cols) => {
    if (values) {
        const query = pgp.helpers.insert(values, cols);
        return db.none(query)
            .then(() => {
                console.log(`Данные успешно записаны (строк: ${values.length})`.green);
            })
            .catch((error) => {
                console.log(error);
            }).finally(() => true);
    }
    console.log('Список значений пуст, запись в базу отменена.');
};

module.exports = {
    db,
    dbInsert,
    pgp,
};
