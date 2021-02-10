const axios = require('axios');
const moment = require('moment');
const colors = require('colors');

// Loading and initializing the library:
const pgp = require('pg-promise')({
    // Initialization Options
});
// Preparing the connection details:
const cn = 'postgres://ko:97136842@185.211.247.12:5432/mango';
// Creating a new database instance from the connection details:
const db = pgp(cn);
const cols = new pgp.helpers.ColumnSet(['start', 'start_day', 'start_time', 'answer_time', 'answer', 'finish', 'from_number', 'to_number', 'disconnect_reason', 'line_number', 'records', 'entry_id', 'location', 'person', 'client', 'call_type', 'call_duration'], { table: 'calls' });

moment.locale('ru');

const date = '2017-03-01';
const defaults = {
    from: moment(date).format('YYYY-MM-DD'),
    to: moment(date).format('YYYY-MM-DD'),
};

const dbInsert = (values, cols) => {
    if (values) {
        const query = pgp.helpers.insert(values, cols);
        return db.none(query)
            .then(() => {
                console.log('Данные успешно записаны'.green);
            })
            .catch((error) => {
                console.log(error);
            }).finally(() => true);
    }
    console.log('Список значений пуст, запись в базу отменена.');
};

const insertCostPerDay = (data, shop) => {
    // console.log('insertCostPerDay', data);
    // console.log('data.costs', data.costs);
    if (data.costs) {
        const values = Object.keys(data.costs).map((item, i) => ({
            date: data.date,
            source: item,
            cost: Math.round(data.costs[item]),
            shop,
        }));
        const cols = new pgp.helpers.ColumnSet(['date', 'source', 'cost', 'shop'], { table: 'cost_per_day' });
        dbInsert(values, cols);
    } else {
        console.log('Нет данных для записи. Отмена записи в БД');
    }
};

const insertOrderSourse = (data, shop) => {
    if (data.roistatStats.length) {
        const values = data.roistatStats.map((item) => ({
            date: data.date,
            order_id: item.id,
            source: item.source,
            shop,

        }));
        const cols = new pgp.helpers.ColumnSet(['date', 'order_id', 'source', 'shop'], { table: 'order_source' });
        dbInsert(values, cols);
    } else {
        console.log('Нет данных для записи. Отмена записи в БД');
    }
};

// Получает данные по звонкам в интервале
const getCostInRange = (dateFrom, dateTo, project) => {
    const url = `http://morgenstern.fun/api/getStats?project=${project}&dateFrom=${dateFrom}&dateTo=${dateTo}&token=jh3145Jjhn234p45665swd`;
    console.log(`Получаем данные по расходу за период c ${moment(dateFrom).format('LL').toString().green} по ${moment(dateTo).format('LL').toString().green}`);
    console.log('Выполняем запрос по адресу:'.red);
    console.log(url);

    return axios.get(url)
        .then((response) => {
            const { data } = response.data;
            // console.log('getCostInRange', data);
            console.log('Данные успешно получены:'.green);
            const message = data && data.length ? `Всего строк получено: ${data.length.toString().green}` : 'Нет данных за выбранный период';
            console.log(message);
            // console.log(response);
            // console.log(response.data.map(item => item.call_duration));
            if (response.data.status === 'success') {
                return data;
            }
            return null;
        })
        .catch((err) => {
            console.error(err);
            inProgress = false;
            return err;
        })
        .finally(() => {

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
    if (!inProgress) {
        inProgress = true;
        return db.any(`SELECT * from cost_per_day WHERE cost_per_day.shop='${project}' ORDER BY id DESC LIMIT 1`)
            .then((data) => {
                const yesterday = moment().subtract(1, 'day');
                let lastModified = data.length ? moment(data[0].date) : moment(date);
                console.log(`Последняя запись в БД по проекту ${project} от:`, moment(data[0].date).format('YYYY-MM-DD').toString().green);
                if (yesterday.format('YYYY-MM-DD') === lastModified.format('YYYY-MM-DD')) {
                    console.log(`Данные по проекту ${project} актуальны. Обновление отменено`);
                } else if (data.length) {
                    lastModified = moment(data[0].date);
                    return getCostPer10days(lastModified.add(1, 'day'), project);
                } else {
                    console.log('Таблица пустая');
                    return getCostPer10days(moment(date), project);
                }
            }).then((data) => {
                if (data && data.length) {
                    insertCostPerDay(data[0], project);
                    insertOrderSourse(data[0], project);
                } else {
                    console.log('Нет данных для записи в базу');
                }
            })
            .catch((e) => {
                console.log(e);
            })
            .finally(() => {
                switchProject();
                inProgress = false;
            });
    }
    console.log(`Предыдущий запрос по проекту ${project} в процессе`);
};

const projects = ['vkostume', 'vipbikini', 'military', 'tutkresla'];
const switchProject = () => {
    projects.push(projects[0]);
    projects.shift();
};

getNWrite(projects[0]);
setInterval(() => {
    getNWrite(projects[0]);
}, 60 * 60 * 1000);
