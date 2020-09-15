const moment = require('moment');
const colors = require('colors');
const eccrmDB = require('./controller/vksDb');
const vpsDB = require('./controller/vpsDb');

const getOrderSalesData = (from, to) => {
    const query = (fromDate, toDate) => `
    SELECT
      o.order_number,
      o.created_at,
      o.phone_key,
      o.client_name,
      ROUND(SUM(i_mod.prime_cost)) AS net_price,
      o.order_sum,
      s.title_eng AS project_name,
      o_s.slug AS order_status,
      o.dop_trata AS extra_expence,
      COUNT(i_o.id) AS item_count
    FROM
      \`ec-crm\`.item_order AS i_o
    LEFT JOIN
      \`ec-crm\`.items AS i ON i.id = i_o.order_id
    LEFT JOIN
      \`ec-crm\`.item_modification AS i_mod ON i_mod.id = i_o.item_modification_id
    LEFT JOIN
      \`ec-crm\`.orders AS o ON o.id = i_o.order_id
    LEFT JOIN
      \`ec-crm\`.item_order_status AS i_o_s ON i_o_s.id = i_o.status_id
    LEFT JOIN
      \`ec-crm\`.shops AS s ON s.id = o.shop_id
    LEFT JOIN
      \`ec-crm\`.order_status AS o_s ON o_s.id = o.status_id
    WHERE
      o.created_at BETWEEN '${fromDate}' AND '${toDate}' 
      -- AND 
      -- i_o.status_id IN (5, 4)
    GROUP BY o.order_number
    ORDER BY o.created_at ASC
    `.trim();

    return new Promise((resolve, reject) => {
        eccrmDB.query(query(from, to), null, (data, error) => {
            if (data) {
                // data.map((item)=>{
                //     console.log('item.order_number', item.order_number);
                //     item.order_number = parseInt(item.order_number);
                // });
                resolve(data);
            } if (error) {
                reject(error);
            }
        });
    });
};

const checkVpsDataState = () => {
    let lastUpdated = '2017-01-01';
    return vpsDB.db.any('SELECT * from order_sales ORDER BY created_at DESC LIMIT 1').then((data) => {
        if (data.length) {
            lastUpdated = data[0].created_at;
            console.log('Последняя запись в БД от:', moment(lastUpdated).format('YYYY-MM-DD HH:mm:ss').toString().green);
        }
        return moment(lastUpdated).add(1, 'second').toDate();
    });
};

const updateViews = () => {
    return vpsDB.db.any('REFRESH MATERIALIZED VIEW tg_bot_orders_by_day')
        .then(res => vpsDB.db.any('REFRESH MATERIALIZED VIEW tg_bot_orders_by_month'))
        .then(res => vpsDB.db.any('REFRESH MATERIALIZED VIEW tg_bot_orders_by_year'))
        .then(res => console.log('Вьюхи обновлены'))
        .catch(e => console.log(e))
};

const insertOrderSalesInfo = (data) => {
    if (data && data.length) {
        const values = data.map((item) => ({
            order_number: item.order_number,
            created_at: item.created_at,
            phone_key: item.phone_key,
            client_name: item.client_name,
            net_price: item.net_price,
            order_sum: item.order_sum,
            project_name: item.project_name,
            order_status: item.order_status,
            extra_expence: item.extra_expence,
            item_count: item.item_count
        }));
        const cols = new vpsDB.pgp.helpers.ColumnSet(['order_number', 'created_at', 'phone_key', 'client_name', 'net_price', 'order_sum','project_name','order_status','extra_expence','item_count'], { table: 'order_sales' });
        vpsDB.dbInsert(values, cols);
    } else {
        console.log('Нет данных для записи. Отмена записи в БД');
    }
};

const deleteOrderSalesInfoFromDate = (from) => {
    console.log(from);
    const query = `
        delete from order_sales
        where created_at > to_timestamp('${from}', 'YYYY-MM-DD HH24:MI:SS');
    `.trim();
    return vpsDB.db.any(query)
        .then(() => {
            console.log('Удаление успешно произведено'.green);
        });
};

let inProgress = false;
const defaultInterval = 30000;
let updateInterval = defaultInterval;

const update = () => {
    if (!inProgress) {
        inProgress = true;
        let diff = -1;
        checkVpsDataState()
            .then((lastUpdated) => {
                diff = moment().diff(moment(lastUpdated), 'days');
                const fromDate = moment(lastUpdated).format('YYYY-MM-DD HH:mm:ss');
                let toDate = moment().format('YYYY-MM-DD HH:mm:ss');
                if (diff > 30) {
                    toDate = moment(lastUpdated).add(30, 'days').format('YYYY-MM-DD HH:mm:ss');

                }
                if (diff > 1) {
                    console.log(`Получаем данные по заказам за период с ${fromDate.toString().green} по ${toDate.toString().green}`);
                    updateInterval = 3600 * 1000;
                    return getOrderSalesData(fromDate, toDate);
                } if (diff === 1) {
                    console.log('Последнее обновление - вчера. Удаляем данные за полгода чтобы актуализировать их.');
                    return deleteOrderSalesInfoFromDate(moment().subtract(6, 'months').format('YYYY-MM-DD HH:mm:ss'));
                }
                return null;
            })
            .then((ecCrmData) => {
                if (ecCrmData && ecCrmData.length) {
                    insertOrderSalesInfo(ecCrmData);
                } else {
                    console.log('Нет данных для записи в базу или данные актуальны');
                }
            }).then(res => updateViews())
            .catch((e) => console.log(e))
            .finally(() => {
                inProgress = false;
            });
    } else {
        console.log('Предыдущий процесс обновления в процессе');
    }
};

update();
setInterval(() => {
    update();
}, updateInterval);
//3600000
