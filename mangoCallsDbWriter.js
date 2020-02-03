const axios = require('axios');
const moment = require('moment');
const colors = require('colors');

moment.locale('ru');

const date = '2018-01-01';

// Получает данные по звонкам в интервале
const getCallsInRange = (dateFrom, dateTo) => {
    const url = `http://185.176.25.157:3000/mango/table?date_from=${moment(dateFrom).unix()}&date_to=${moment(dateTo).unix()}`;
    console.log(`Получаем данные за период c ${moment(dateFrom).format('LLLL')} по ${moment(dateTo).format('LLLL')}`.cyan);
    console.log('Выполняем запрос по адресу:'.cyan);
    console.log(url);

    axios.get(url)
        .then(function(response) {
            console.log('Данные успешно получены:'.green);
            console.log(response.data.length);
        })
        .catch(function (err){
            console.error(err);
        })
        .finally(function () {
            // console.log(`Скрипт выполнен`.cyan)
        });
};


// Получает данные за месяц с начала месяца от указанной даты
const getCallsPerMonth = (date) => {
    const dateFrom = moment(date).startOf('month');
    const dateTo = moment(date).startOf('month').endOf('month');
    getCallsInRange(dateFrom, dateTo);
};

getCallsPerMonth(date);

