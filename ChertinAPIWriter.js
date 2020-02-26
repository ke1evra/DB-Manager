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
                // console.log(query);
                console.log('Данные успешно записаны'.green);
            })
            .catch(error => {
                console.log(error);
            }).finally(function () {
                // inProgress = false;
                // console.log(`Скрипт выполнен`.red)
            });
    } else {
        console.log('Список значений пуст, запись в базу отменена.')
    }

};

const insertCostPerDay = (data, shop) => {
    // console.log('insertCostPerDay', data);
    // console.log('data.costs', data.costs);
    if (data.costs) {
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
    } else {
        console.log('Нет данных для записи. Отмена записи в БД')
    }

};

const insertOrderSourse = (data, shop) => {
    if (data.roistatStats.length) {
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
    } else {
        console.log('Нет данных для записи. Отмена записи в БД')
    }
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
            if(response.data.status === 'success'){
                return data;
            } else {
                throw new Error('Получен статус отличный от success');
            }

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
//
const getCostPer10days = (day, project) => {
    const from = moment(day).format('YYYY-MM-DD');
    const to = moment(day).add(10, 'days').format('YYYY-MM-DD');
    return getCostInRange(from, to, project);
};




let inProgress = false;

const getNWrite = (project) => {
    if (!inProgress){
        inProgress = true;
        return db.any(`SELECT * from cost_per_day WHERE cost_per_day.shop='${project}' ORDER BY id DESC LIMIT 1`)
            .then((data) => {
                const yesterday = moment().subtract(1, 'day');
                const lastModified = moment(data[0].date);
                    if(yesterday.format('YYYY-DD-MM') === lastModified.format('YYYY-DD-MM')) {
                        console.log(`Данные по проекту ${project} актуальны. Обновление отменено`)
                    } else if (data.length) {
                        let lastModified = moment(data[0].date);
                        console.log(`Последняя запись в БД по проекту ${project} от:`, moment(data[0].date).format('YYYY-DD-MM').toString().green);
                        return getCostPerDay(lastModified.add(1, 'day'), project);
                    } else {
                        console.log('Таблица пустая');
                        return getCostPerDay(date, project);
                    }
            }).then( data => {
                if (data && data.length){
                    insertCostPerDay(data[0], project);
                    insertOrderSourse(data[0], project);
                } else {
                    console.log('Нет данных для записи в базу');
                };
            })
            .catch(e => {
                console.log(e);
            })
            .finally(() => {
                switchProject();
                inProgress = false;
            });
    } else {
        console.log(`Предыдущий запрос по проекту ${project} в процессе`);
    }
};

const projects = ['vkostume', 'vipbikini', 'military', 'tutkresla'];
const switchProject = () => {
    projects.push(projects[0]);
    projects.shift();
};

// getNWrite();
setInterval( () => {
    getNWrite(projects[0]);
},3000);
