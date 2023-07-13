var express = require('express');
var router = express.Router();

var sheets = require('../models/sheets');
sheets.authorize().catch(error => console.log(error));

/* GET home page. */
router.get('/', async function (req, res, next) {
    let itemList, item, isPPE;
    item = req.query['name'];
    let quantityValue = ``;
    if(item){
        itemList = 'GenericItemList'
    }
    else{
        item = req.query['serialNumber'];
        if(item){
            itemList = 'SerialItemList'
            quantityValue = '1';
        }
        else{
            item = req.query['ppe'];
            itemList = 'PPEItemList'
            isPPE = true;
        }
    }



    let itemData = await sheets.getRangeData(`${itemList}!B:D`);
    let itemValues = itemData.data.values;
    let itemName = itemValues.map(x => x[0]);
    let request = element => element === item;
    let foundItemIndex = itemName.findIndex(request);

    let itemAvailableQuantity = itemValues.map(x => x[1])[foundItemIndex];
    let itemBorrowedQuantity = itemValues.map(x => x[2])[foundItemIndex];



    res.render('index',
        {
            title: `Item: ${item}`,
            item: `${item}`,
            itemAvailableQuantity: `${itemAvailableQuantity}`,
            itemBorrowedQuantity: `${itemBorrowedQuantity}`,
            foundItemIndex: `${foundItemIndex}`,
            itemList: `${itemList}`,
            quantityValue: `${quantityValue}`,
            isPPE: `${isPPE}`,
        });
});

router.post('/borrow', async function (req, res, next) {
    const item = req.body.item;
    const itemList = req.body.itemList;
    const name = req.body.name;
    const quantity = Number(req.body.quantity);
    const foundItemIndex = Number(req.body.foundItemIndex) + 1;
    const itemAvailableQuantity = Number(req.body.itemAvailableQuantity);
    const itemBorrowedQuantity = Number(req.body.itemBorrowedQuantity);


    const isPPE = req.body.isPPE;
    if(isPPE !== 'true'){
        await sheets.setRangeData(`${itemList}!D${foundItemIndex}`, [itemBorrowedQuantity + quantity]);
    }
    else{
        await sheets.setRangeData(`${itemList}!C${foundItemIndex}`, [itemAvailableQuantity - quantity]);
    }

    await sheets.appendRangeData(`Logs!A1:C1`, ['=lambda(x,x)(now())', name, item, 'BORROW', quantity]);

    res.render('submit', {message: `Borrowed ${item} x ${quantity}`})
});

router.post('/return', async function (req, res, next) {
    const item = req.body.item;
    const itemList = req.body.itemList;
    const name = req.body.name;
    const quantity = Number(req.body.quantity);
    const foundItemIndex = Number(req.body.foundItemIndex) + 1;
    const itemBorrowedQuantity = Number(req.body.itemBorrowedQuantity);

    await sheets.setRangeData(`${itemList}!D${foundItemIndex}`, [itemBorrowedQuantity - quantity]);
    await sheets.appendRangeData(`Logs!A1:C1`, ['=lambda(x,x)(now())', name, item, 'RETURN', quantity]);

    res.render('submit', {message: `Returned ${item} x ${quantity}`});
});

module.exports = router;
