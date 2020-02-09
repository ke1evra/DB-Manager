const axios = require('axios');
const moment = require('moment');
const colors = require('colors');

// const { Pool } = require('pg')
// const pool = new Pool({
//     user: 'ko',
//     host: '185.176.25.157',
//     database: 'mango',
//     password: '97136842',
//     port: 5432,
// });

// Loading and initializing the library:
const pgp = require('pg-promise')({
    // Initialization Options
});
// Preparing the connection details:
const cn = 'postgres://ko:97136842@185.176.25.157:5432/mango';
// Creating a new database instance from the connection details:
const db = pgp(cn);
const cols = new pgp.helpers.ColumnSet(['start', 'start_day', 'start_time', 'answer_time', 'answer', 'finish', 'from_number', 'to_number', 'disconnect_reason', 'line_number', 'records', 'entry_id', 'location', 'person', 'client', 'call_type', 'call_duration'], {table: 'calls'});

moment.locale('ru');

const date = '2018-01-02';

const dbInsert = (values, cols) => {
    const query = pgp.helpers.insert(values, cols);
    return db.none(query)
        .then(data => {
            console.log('Данные успешно записаны'.green);
        })
        .catch(error => {
            console.log(error);
        }).finally(function () {
            inProgress = false;
            // console.log(`Скрипт выполнен`.red)
        });
};

// Получает данные по звонкам в интервале
const getCallsInRange = (dateFrom, dateTo) => {
    const url = `http://185.176.25.157:3000/mango/table?date_from=${moment(dateFrom).unix()}&date_to=${moment(dateTo).unix()}`;
    console.log(`Получаем данные за период c ${moment(dateFrom).format('LLL').toString().green} по ${moment(dateTo).format('LLL').toString().green}`);
    console.log('Выполняем запрос по адресу:'.red);
    console.log(url);

    return axios.get(url)
        .then(function(response) {
            console.log('Данные успешно получены:'.green);
            console.log(`Всего строк получено: ${response.data.length.toString().green}`);
            // console.log(response.data.map(item => item.call_duration));
            dbInsert(response.data, cols);
            return response.data;
        })
        .catch(function (err){
            console.error(err);
            inProgress = false;
            return err;
        })
        .finally(function () {

            // console.log(`Скрипт выполнен`.red)
        });
};


// Получает данные за месяц с начала месяца от указанной даты
const getCallsPerMonth = (date) => {
    console.log(`Получаем данные за месяц на основе этой даты ${moment(date).format('ll')}`);
    const dateFrom = moment(date).startOf('month');
    const dateTo = moment(date).startOf('month').endOf('month');
    getCallsInRange(dateFrom, dateTo).then((response) => {
        console.table(response[0]);
    });
};

// Получает данные за день с начала дня от указанной даты
const getCallsPerDay = (date) => {
    console.log(`Получаем данные за день на основе этой даты ${moment(date).format('ll').toString().green}`);
    const dateFrom = moment(date).startOf('day');
    const dateTo = moment(date).startOf('day').endOf('day');
    getCallsInRange(dateFrom, dateTo)
        .then((response) => {
            console.table(response[0]);
        })
        .catch(function (err){
            console.error(err);
            return err;
        });
};

// getCallsPerDay(date);

// const query = {
//     text: 'SELECT * from calls ORDER BY id DESC LIMIT 1',
// };

// pool
//     .query(query)
//     .then(res => console.table(res.rows[0]))
//     .catch(e => console.error(e));




// db.any('SELECT * from calls ORDER BY id DESC LIMIT 1').then((data)=>{
//     console.table(data);
//     console.log('Последняя запись в БД от:', moment.unix(data[0].start).format('YYYY-DD-MM HH:mm:ss').toString().green);
//     if( (+ new Date() / 1000 - data[0].start * 1) > 2629743) {
//         console.log('С момента последнего обновления прошло больше 30 дней');
//         getCallsInRange(moment.unix(data[0].start), moment.unix(data[0].start).add(10, 'days'));
//     }
// });



let inProgress = false;

setInterval(() => {
    if (!inProgress){
        inProgress = true;
        db.any('SELECT * from calls ORDER BY id DESC LIMIT 1').then((data) => {
            console.table(data);
            console.log('Последняя запись в БД от:', moment.unix(data[0].start).format('YYYY-DD-MM HH:mm:ss').toString().green);
            let dateTo = moment();
            if ((+new Date() / 1000 - data[0].start * 1) > 2629743) {
                console.log('С момента последнего обновления прошло больше 30 дней');
                dateTo = moment.unix(data[0].start).add(10, 'days')
            }
            return getCallsInRange(moment.unix(data[0].start), dateTo);
        });
    } else {
        console.log('Предыдущий запрос в процессе');
    }
},30000);
