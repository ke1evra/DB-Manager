const axios = require('axios');
const moment = require('moment');
const colors = require('colors');

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

const date = '2017-02-01';
const defaults = {
    from: moment(date).format('YYYY-MM-DD'),
    to: moment(date).format('YYYY-MM-DD'),
};

const dbInsert = (values, cols) => {
    if (values) {
        const query = pgp.helpers.insert(values, cols);
        return db.none(query)
            .then(data => {
                console.log(query);
                console.log('Данные успешно записаны'.green);
            })
            .catch(error => {
                console.log(error);
            }).finally(function () {
                inProgress = false;
                // console.log(`Скрипт выполнен`.red)
            });
    } else {
        console.log('Список значений пуст, запись в базу отменена.')
    }

};

const insertCostPerDay = (data, shop) => {
    // console.log('insertCostPerDay', data);
    // console.log('data.costs', data.costs);
    const values = Object.keys(data.costs).map((item, i) => {
        return {
            date: data.date,
            source: item,
            cost: Math.round(data.costs[item]),
            shop
        }
    });
    const cols = new pgp.helpers.ColumnSet(['date', 'source', 'cost', 'shop'], {table: 'cost_per_day'});
    dbInsert(values, cols);
};

const insertOrderSourse = (data, shop) => {
    const values = data.roistatStats.map((item) => {
        return {
            date: data.date,
            order_id: item.id,
            source: item.source,
            shop

        };
    });
    const cols = new pgp.helpers.ColumnSet(['date', 'order_id', 'source', 'shop'], {table: 'order_source'});
    dbInsert(values, cols);
};

// Получает данные по звонкам в интервале
const getCostInRange = (dateFrom, dateTo, project) => {
    const url = `http://wabot.host/api/getStats?project=${project}&dateFrom=${dateFrom}&dateTo=${dateTo}&token=jh3145Jjhn234p45665swd`;
    console.log(`Получаем данные по расходу за период c ${moment(dateFrom).format('LL').toString().green} по ${moment(dateTo).format('LL').toString().green}`);
    console.log('Выполняем запрос по адресу:'.red);
    console.log(url);

    return axios.get(url)
        .then(function(response) {
            const data = response.data.data;
            // console.log('getCostInRange', data);
            console.log('Данные успешно получены:'.green);
            console.log(`Всего строк получено: ${data.length.toString().green}`);
            // console.log(response.data.map(item => item.call_duration));

            return data;
        })
        .catch(function (err){
            console.error(err);
            inProgress = false;
            return err;
        })
        .finally(function () {

        });
};

const getCostPerDay = (day, project) => {
    const from = moment(day).format('YYYY-MM-DD');
    const to = moment(day).format('YYYY-MM-DD');
    return getCostInRange(from, to, project);
};




let inProgress = false;

const getNWrite = () => {
    if (!inProgress){
        inProgress = true;
        db.any('SELECT * from cost_per_day ORDER BY id DESC LIMIT 1')
            .then((data) => {
                // console.log('getNWrite 1st then', data);
                    if (data.length) {
                        let lastModified = moment(data[0].date);
                        console.table(data);
                        console.log('Последняя запись в БД от:', moment(data[0].date).format('YYYY-DD-MM').toString().green);
                        return getCostPerDay(lastModified.add(1, 'day'), 'vkostume');
                    } else {
                        console.log('Таблица пустая');
                        return getCostPerDay(date, 'vkostume');
                    }

            }).then( data => {
                // console.log('getNWrite 2st then', data);
                insertCostPerDay(data[0], 'vkostume');
                insertOrderSourse(data[0], 'vkostume');
            })
            .catch(e => console.log(e));
    } else {
        console.log('Предыдущий запрос в процессе');
    }
};


getNWrite();
// setInterval(() => {
//     getNWrite();
// },300000);
