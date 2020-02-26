const eccrmDB = require('./controller/vksDb');
const vpsDB = require('./controller/vpsDb');
const moment = require('moment');
const colors = require('colors');

const getOrderSalesData = async (from, to) => {
    const query = (from, to) => `
    SELECT  
      o.order_number,
      o.created_at,
      SUM(i_mod.prime_cost) AS net_price,
      o.order_sum
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
    WHERE
      o.created_at BETWEEN '${from}' AND '${to}' 
      AND 
      i_o.status_id IN (5, 4)
    GROUP BY o.order_number
    ORDER BY o.created_at DESC
    `.trim();
    await eccrmDB.query(query(from,to), null, async function (data, error) {
        if(data){
            console.table(data);
            return data;
        }else if(error){
            console.log(error);
        }
    });
};

const checkVpsDataState = () => {
    let lastUpdated = '2017-01-01';
    //let diff = 0;
    return vpsDB.any('SELECT * from order_sales ORDER BY created_at DESC LIMIT 1').then((data) => {
        if (data.length) {
            console.table(data);
            lastUpdated = data[0].created_at;
            console.log('Последняя запись в БД от:', moment(lastUpdated).format('YYYY-DD-MM HH:mm:ss').toString().green);
            //diff = moment().diff(moment(lastUpdated), 'days');
            // if ( diff > 90 ) {
            //     console.log(`Последняя запись в БД более 90 дней (${diff})`);
            // }
        }
        return lastUpdated;
    });
};


// запускаем прогу
(async ()=>{
    const lastUpdated = moment(await checkVpsDataState()).format('YYYY-MM-DD HH:mm:ss');
    const toDate = moment(lastUpdated).add(30, 'days').format('YYYY-MM-DD HH:mm:ss');
    console.log(lastUpdated, toDate);
    await getOrderSalesData(lastUpdated, toDate)

})();


