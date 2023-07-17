var express = require('express');
var router = express.Router();

var sheets = require('../models/sheets');
sheets.authorize().catch(error => console.log(error));

/* GET home page. */
router.get('/', async function (req, res, next) {
    let itemList, item, isPPE = '';
    item = req.query['name'];
    let quantityValue = ``;
    if (item) {
        itemList = 'GenericItemList'
    } else {
        item = req.query['serialNumber'];
        if (item) {
            itemList = 'SerialItemList'
            quantityValue = '1';
        } else {
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
    const itemBorrowedQuantity = Number(req.body.itemBorrowedQuantity);

    await sheets.setRangeData(`${itemList}!D${foundItemIndex}`, [itemBorrowedQuantity + quantity]);

    await sheets.appendRangeData(`Logs!A1:C1`,
        ['=lambda(x,x)(now())', name, item, itemList, 'BORROW', quantity]);

    res.render('submit', {message: `Borrowed ${item} x ${quantity}`})
});

router.post('/release', async function (req, res, next) {
    const item = req.body.item;
    const itemList = req.body.itemList;
    const name = req.body.name;
    const quantity = Number(req.body.quantity);
    const foundItemIndex = Number(req.body.foundItemIndex) + 1;
    const itemAvailableQuantity = Number(req.body.itemAvailableQuantity);

    await sheets.setRangeData(`${itemList}!E${foundItemIndex}`, [itemAvailableQuantity - quantity]);
    await sheets.appendRangeData(`Logs!A1:C1`,
        ['=lambda(x,x)(now())', name, item, itemList, 'RELEASE', quantity]);

    res.render('submit', {message: `Released ${item} x ${quantity}`});
});

router.post('/return', async function (req, res, next) {
    const item = req.body.item;
    const itemList = req.body.itemList;
    const name = req.body.name;
    const quantity = Number(req.body.quantity);
    const foundItemIndex = Number(req.body.foundItemIndex) + 1;
    const itemBorrowedQuantity = Number(req.body.itemBorrowedQuantity);

    await sheets.setRangeData(`${itemList}!D${foundItemIndex}`, [itemBorrowedQuantity - quantity]);
    await sheets.appendRangeData(`Logs!A1:C1`,
        ['=lambda(x,x)(now())', name, item, itemList, 'RETURN', quantity]);

    res.render('submit', {message: `Returned ${item} x ${quantity}`});
});

router.get('/add', async function (req, res, next) {
    res.render('add', {title: 'Add Item'});
});

// router.post('/add', async function (req, res, next) {
//     const item = req.body.item;
//     const itemList = req.body.itemList;
//     const quantity = Number(req.body.quantity);
//
//     let itemData = await sheets.getRangeData(`${itemList}!B:D`);
//     let itemValues = itemData.data.values;
//     let itemName = itemValues.map(x => x[0]);
//     let request = element => element === item;
//     let foundItemIndex = itemName.findIndex(request);
//
//     if(foundItemIndex === -1){
//         await sheets.appendRangeData(`${itemList}!B:D`, [item, quantity, 0]);
//         res.render('submit', {message: `Added ${item} x ${quantity}`});
//     }
//     else{
//         await sheets.setRangeData(`${itemList}!C${foundItemIndex + 1}`,
//             [Number(itemValues[foundItemIndex][2]) + quantity]);
//         res.render('submit', {message: `Added ${item} x ${quantity}`});
//     }
// });

router.post('/add', async function (req, res, next) {
    console.log(req.body);

    const item = req.body.name;
    const itemList = req.body.category;
    const itemSerial = req.body.serial;
    const itemQuantity = Number(req.body.quantity);

    //A = item name, B = item serial, C = available quantity, D = borrowed quantity, E = total quantity, F = Availability
    let itemData = await sheets.getRangeData(`${itemList}!A:E`);
    let itemValues = itemData.data.values;
    let itemName, request, foundItemIndex;
    if (itemSerial === undefined) {
        itemName = itemValues.map(x => x[1]);
        request = element => element === item;
        foundItemIndex = itemName.findIndex(request);
        if (foundItemIndex === -1) {
            let linkName = 'name'
            if (itemList === 'PPEItemList') {
                linkName = 'ppe'
            }
            await sheets.appendRangeData(`${itemList}!A1:C1`,
                ['', item, '=IF(ISBLANK(INDIRECT(CONCAT("B", ROW()))), "", INDIRECT(CONCAT("E", ROW()))-INDIRECT(CONCAT("D", ROW())))', 0, itemQuantity, '',
                    `=IF(ISBLANK(INDIRECT(CONCAT("B", ROW()))), "", HYPERLINK(CONCAT("https://lpi-qr-inventory.onrender.com/?${linkName}=",INDIRECT(CONCAT("B", ROW())))))`]
            );
        } else {
            await sheets.setRangeData(`${itemList}!E${foundItemIndex + 1}`,
                [Number(itemValues[foundItemIndex][4]) + itemQuantity]);
        }
        await sheets.appendRangeData(`Logs!A1:C1`,
            ['=lambda(x,x)(now())', 'ADMIN', item, itemList, 'ADD', itemQuantity]);
    } else {
        itemName = itemValues.map(x => x[1]);
        request = element => element === itemSerial;
        foundItemIndex = itemName.findIndex(request);
        if (foundItemIndex === -1) {
            await sheets.appendRangeData(`${itemList}!A1:C1`,
                [item, itemSerial, '=INDIRECT(CONCAT("E",row()))-INDIRECT(CONCAT("D",row()))', 0, '1',
                    '=IF(ISBLANK(INDIRECT(CONCAT("B", ROW()))),"", IF(INDIRECT(CONCAT("C", ROW()))<1, "BORROWED", "AVAILABLE"))', '',
                    '=IF(ISBLANK(INDIRECT(CONCAT("B", ROW()))),"", HYPERLINK(CONCAT("https://lpi-qr-inventory.onrender.com/?serialNumber=",INDIRECT(CONCAT("B", ROW())))))'
                ]
            );
            await sheets.appendRangeData(`Logs!A1:C1`,
                ['=lambda(x,x)(now())', 'ADMIN', item, itemList, 'ADD', itemQuantity]);
        } else {
            res.render('submit', {message: `Item already exists!`})
        }
    }

    res.render('submit', {message: `Added `});
});
module.exports = router;
