var express = require('express');
var router = express.Router();

var sheets = require('../models/sheets');
sheets.authorize().catch(error => console.log(error));

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index',
        {
            title: `Item: ${req.query['name']}`,
            item: `${req.query['name']}`,
        });
});

router.post('/borrow', async function (req, res, next) {
    const item = req.body.item;
    const name = req.body.name;

    await sheets.appendRangeData(`Logs!A:C`, ['=lambda(x,x)(now())', name, item]);

    let itemData = await sheets.getRangeData('ItemList!A:B');
    let itemValues = itemData.data.values;
    // let itemData = await sheets.getRangeData('ItemList!A:B').data.values[0];
    let itemName = itemValues.map(x => x[0]);
    let request = element => element === item;
    let foundItemIndex = itemName.findIndex(request);

    let itemStatus = itemValues.map(x => x[1])[foundItemIndex];
    if (itemStatus === 'AVAILABLE') {
        await sheets.setRangeData(`ItemList!B${foundItemIndex + 1}`, ['BORROWED']);
        res.render('borrow', {title: `Borrowing: ${name}`, message: `Borrowed ${item}`});
    } else {
        await sheets.setRangeData(`ItemList!B${foundItemIndex + 1}`, ['AVAILABLE']);
        res.render('borrow', {title: `Returning: ${name}`, message: `Returned ${item}`});
    }


});

module.exports = router;
