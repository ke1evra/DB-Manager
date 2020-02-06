const axios = require('axios');
const moment = require('moment');
const colors = require('colors');

moment.locale('ru');

const date = '2018-01-02';

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
            return response.data;
        })
        .catch(function (err){
            console.error(err);
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
    getCallsInRange(dateFrom, dateTo).then((response) => {
        console.table(response[0]);
    });
};

getCallsPerDay(date);

