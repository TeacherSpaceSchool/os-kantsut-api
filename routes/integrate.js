const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Item = require('../models/item');
const CashExchange = require('../models/cashExchange');
const randomstring = require('randomstring');
const ModelsError = require('../models/error');
const Category = require('../models/category');
const Balance1C = require('../models/balance1C');
const Storage = require('../models/storage');
const StorageHistory = require('../models/storageHistory');
const Balance1CHistory = require('../models/balance1CHistory');
const ExpenseReport = require('../models/expenseReport');
const CashConsumable = require('../models/cashConsumable');
const { pubsub } = require('../graphql/index');
const RELOAD_DATA = 'RELOAD_DATA';
const { sendWebPushByRolesIds } = require('../module/webPush');
const {changeBalance} = require('../graphql/balance');
const { checkInt, pdDDMMYYYY, codeByCurrencys, currencysByCode } = require('../module/const');
const builder = require('xmlbuilder');

router.post('/put/storage', async (req, res, next) => {
    res.set('Content+Type', 'application/xml');
    let _object, item
    try{
        for(let i=0;i<req.body.elements[0].elements.length;i++) {
            item = await Item.findOne({GUID: req.body.elements[0].elements[i].attributes.item}).select('_id').lean()
            if(item) {
                _object = await Storage.findOne({item: item._id})
                if (!_object) {
                    _object = new Storage({
                        count: req.body.elements[0].elements[i].attributes.count,
                        item: item._id
                    });
                    await Storage.create(_object);
                    let storageHistory = new StorageHistory({
                        item: item._id,
                        count: `0 + ${req.body.elements[0].elements[i].attributes.count} = ${req.body.elements[0].elements[i].attributes.count}`
                    });
                    await StorageHistory.create(storageHistory);
                }
                else {
                    let storageHistory = new StorageHistory({
                        item: item._id,
                        count: `${_object.count} ${_object.count>req.body.elements[0].elements[i].attributes.count?`- ${_object.count-req.body.elements[0].elements[i].attributes.count}`:`+ ${req.body.elements[0].elements[i].attributes.count-_object.count}`} = ${req.body.elements[0].elements[i].attributes.count}`
                    });
                    await StorageHistory.create(storageHistory);
                    _object.count = req.body.elements[0].elements[i].attributes.count
                    await _object.save();
                }

            }
        }
        await res.status(200);
        await res.end('success')
    } catch (err) {
        _object = new ModelsError({
            err: err.message,
            path: 'put employment'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/put/balance1C', async (req, res, next) => {
    res.set('Content+Type', 'application/xml');
    let _object, supplier, amount, amountHistory, find, difference
    try{
        for(let i=0;i<req.body.elements[0].elements.length;i++) {
            supplier = await User.findOne({GUID: req.body.elements[0].elements[i].attributes.supplier}).select('_id').lean()
            if(supplier) {
                if (req.body.elements[0].elements[i].attributes.del !== '1') {
                    _object = await Balance1C.findOne({supplier: supplier._id})
                    if (!_object) {
                        _object = new Balance1C({
                            amount: [],
                            supplier: supplier._id
                        });
                        amountHistory = []
                        for (let i1 = 0; i1 < req.body.elements[0].elements[i].elements.length; i1++) {
                            _object.amount.push({
                                name: currencysByCode[req.body.elements[0].elements[i].elements[i1].attributes.currencyType],
                                value: req.body.elements[0].elements[i].elements[i1].attributes.value
                            })
                        }
                        await Balance1C.create(_object);
                        let balance1CHistory = new Balance1CHistory({
                            supplier: supplier._id,
                            amount: _object.amount.map(element=>`0 + ${element.value} = ${element.value} ${element.name}`)
                        });
                        await Balance1CHistory.create(balance1CHistory);
                    }
                    else {
                        amount = []
                        amountHistory = []
                        for (let i1 = 0; i1 < req.body.elements[0].elements[i].elements.length; i1++) {
                            find = false
                            for (let i2 = 0; i2 < _object.amount.length; i2++) {
                                if(_object.amount[i2].name===currencysByCode[req.body.elements[0].elements[i].elements[i1].attributes.currencyType]){
                                    find = true
                                    difference = checkInt(req.body.elements[0].elements[i].elements[i1].attributes.value) - checkInt(_object.amount[i2].value)
                                    if(difference!==0)
                                        amountHistory.push(`${_object.amount[i2].value} ${difference>0?'+':'-'} ${Math.abs(difference)} = ${req.body.elements[0].elements[i].elements[i1].attributes.value} ${_object.amount[i2].name}`)
                                }
                            }
                            if(!find)
                                amountHistory.push(`0 + ${req.body.elements[0].elements[i].elements[i1].attributes.value} = ${req.body.elements[0].elements[i].elements[i1].attributes.value} ${currencysByCode[req.body.elements[0].elements[i].elements[i1].attributes.currencyType]}`)
                            amount.push({
                                name: currencysByCode[req.body.elements[0].elements[i].elements[i1].attributes.currencyType],
                                value: req.body.elements[0].elements[i].elements[i1].attributes.value
                            })
                        }
                        _object.amount = [...amount]
                        await _object.save();
                        if(amountHistory.length){
                            let balance1CHistory = new Balance1CHistory({
                                supplier: supplier._id,
                                amount: amountHistory
                            });
                            await Balance1CHistory.create(balance1CHistory);
                        }
                    }
                }
                else {
                    await Balance1C.deleteMany({supplier: supplier._id})
                    await Balance1CHistory.deleteMany({supplier: supplier._id})
                }
            }
        }
        await res.status(200);
        await res.end('success')
    } catch (err) {
        _object = new ModelsError({
            err: err.message,
            path: 'put employment'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/put/item', async (req, res, next) => {
    res.set('Content+Type', 'application/xml');
    let item, category
    try{
        for(let i=0;i<req.body.elements[0].elements.length;i++) {
            if(req.body.elements[0].elements[i].attributes.del!=='1') {
                category = await Category.findOne({GUID: req.body.elements[0].elements[i].attributes.categoryGuid}).select('_id').lean()
                if (!category) {
                    category = new Category({
                        name: req.body.elements[0].elements[i].attributes.categoryName,
                        suppliers: [],
                        GUID: req.body.elements[0].elements[i].attributes.categoryGuid
                    });
                    category = await Category.create(category)
                }
                item = await Item.findOne({GUID: req.body.elements[0].elements[i].attributes.guid}).populate('category')
                if (!item) {
                    item = new Item({
                        name: req.body.elements[0].elements[i].attributes.name,
                        category: category._id,
                        GUID: req.body.elements[0].elements[i].attributes.guid,
                        lastPrice: []
                    });
                    await Item.create(item)
                }
                else {
                    item.del = null
                    item.name = req.body.elements[0].elements[i].attributes.name
                    if(item.category.GUID!==req.body.elements[0].elements[i].attributes.categoryGuid){
                        item.category = category._id
                    }
                    await item.save();
                }
            }
            else {
                await Item.deleteMany({GUID: req.body.elements[0].elements[i].attributes.guid})
            }
        }
        await res.status(200);
        await res.end('success')
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'put employment'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/put/employment', async (req, res, next) => {
    res.set('Content+Type', 'application/xml');
    let _object
    try{
        for(let i=0;i<req.body.elements[0].elements.length;i++) {
            if(req.body.elements[0].elements[i].attributes.del!=='1') {
                _object = await User.findOne({GUID: req.body.elements[0].elements[i].attributes.guid})
                if (!_object) {
                    _object = new User({
                        login: randomstring.generate(10),
                        role: 'снабженец',
                        status: 'active',
                        password: '12345678',
                        name: req.body.elements[0].elements[i].attributes.name,
                        GUID: req.body.elements[0].elements[i].attributes.guid,
                        phone: '',
                        pinCode: randomstring.generate({
                            length: 4,
                            charset: 'numeric'
                        })
                    });
                    await User.create(_object);
                }
                else {
                    _object.del = null
                    _object.name = req.body.elements[0].elements[i].attributes.name
                    await _object.save();
                }
            }
            else {
                await User.updateMany({GUID: req.body.elements[0].elements[i].attributes.guid}, {del: 'deleted'})
            }
        }
        await res.status(200);
        await res.end('success')
    } catch (err) {
        _object = new ModelsError({
            err: err.message,
            path: 'put employment'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/put/cashconsumable', async (req, res, next) => {
    res.set('Content+Type', 'application/xml');
    let _object
    try{
        for(let i=0;i<req.body.elements[0].elements.length;i++) {
            _object = await User.findOne({GUID: req.body.elements[0].elements[i].attributes.supplier}).lean()
            let cashConsumable = await CashConsumable.findOne({GUID: req.body.elements[0].elements[i].attributes.guid}).lean()
            if(_object) {
                if(req.body.elements[0].elements[i].attributes.del!=='1'&&!cashConsumable) {
                    let number = randomstring.generate({length: 6, charset: 'numeric'});
                    while (await CashConsumable.findOne({number: number}).lean())
                        number = randomstring.generate({length: 6, charset: 'numeric'});
                    let newCashConsumable = new CashConsumable({
                        comment: req.body.elements[0].elements[i].attributes.comment,
                        number: number,
                        amount: checkInt(req.body.elements[0].elements[i].attributes.amount),
                        supplier: _object._id,
                        currencyType: currencysByCode[req.body.elements[0].elements[i].attributes.currencyType],
                        budget: req.body.elements[0].elements[i].attributes.budget,
                        GUID: req.body.elements[0].elements[i].attributes.guid
                    });
                    newCashConsumable = await CashConsumable.create(newCashConsumable);
                    await sendWebPushByRolesIds({
                        title: 'Кассовый расходник добавлен',
                        message: `Кассовый расходник №${newCashConsumable.number} добавлен`,
                        url: `${process.env.URL.trim()}/cashconsumable/${newCashConsumable._id}`,
                        roles: ['admin', 'менеджер'],
                        _ids: [newCashConsumable.supplier]
                    })
                    pubsub.publish(RELOAD_DATA, {
                        reloadData: {
                            type: 'ADD',
                            who: null,
                            ids: [newCashConsumable.supplier],
                            roles: ['admin', 'менеджер'],
                            application: undefined,
                            cashConsumable: await CashConsumable.findOne({
                                _id: newCashConsumable._id
                            })
                                .populate('supplier')
                                .lean(),
                            waybill: undefined,
                            expenseReport: undefined,
                            balance: undefined,
                        }
                    });
                    await changeBalance({
                        supplier: _object._id,
                        currencyType: currencysByCode[req.body.elements[0].elements[i].attributes.currencyType],
                        addAmount: checkInt(req.body.elements[0].elements[i].attributes.amount),
                        removeAmount: 0
                    })
                }
                else if(cashConsumable&&req.body.elements[0].elements[i].attributes.del==='1') {
                    await changeBalance({supplier: cashConsumable.supplier, currencyType: cashConsumable.currencyType, addAmount: 0, removeAmount: cashConsumable.amount})
                    pubsub.publish(RELOAD_DATA, {
                        reloadData: {
                            type: 'DELETE',
                            who: null,
                            ids: [cashConsumable.supplier],
                            roles: ['бухгалтерия', 'кассир', 'admin', 'менеджер'],
                            application: undefined,
                            cashConsumable: {_id: cashConsumable._id},
                            waybill: undefined,
                            expenseReport: undefined,
                            balance: undefined,
                        }
                    });
                    await CashConsumable.deleteMany({GUID: req.body.elements[0].elements[i].attributes.guid})
                }
            }
        }
        await res.status(200);
        await res.end('success')
    } catch (err) {
        _object = new ModelsError({
            err: err.message,
            path: 'put cashconsumable'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.get('/out/expensereport', async (req, res, next) => {
    let _objects = await ExpenseReport.find({status: 'принят', sync: {$ne: 1}})
        .populate({
            path: 'waybills',
            populate: {
                path: 'application',
                populate: {
                    path: 'division'
                }
            }
        })
        .populate('supplier')
        .populate('cashConsumables')
        .lean()
    try{
        let result = builder.create('root');
        let item
        let receivedAmounts
        let expenseAmounts
        let overExpenses
        let outCashbox
        let balanceEnd
        let waybills
        let waybill
        for(let i=0;i<_objects.length;i++) {
            if(_objects[i].supplier.GUID&&_objects[i].supplier.GUID.length>0) {
                item = result.ele('item')
                    .att('supplier', _objects[i].supplier.GUID)
                    .att('guid', _objects[i].GUID)
                    .att('date', pdDDMMYYYY(_objects[i].createdAt))
                receivedAmounts = item.ele('received_amounts')
                for(let i1 = 0; i1<_objects[i].receivedAmount.length; i1++) {
                    receivedAmounts.ele('received_amount')
                        .att('currency', codeByCurrencys[_objects[i].receivedAmount[i1].name])
                        .att('value', _objects[i].receivedAmount[i1].value)
                }
                expenseAmounts = item.ele('expense_amounts')
                for(let i1 = 0; i1<_objects[i].expense.length; i1++) {
                    expenseAmounts.ele('expense_amount')
                        .att('currency', codeByCurrencys[_objects[i].expense[i1].name])
                        .att('value', _objects[i].expense[i1].value)
                }
                if(_objects[i].overExpense.length>0) {
                    overExpenses = item.ele('over_expenses')
                    for (let i1 = 0; i1 < _objects[i].overExpense.length; i1++) {
                        overExpenses.ele('over_expense')
                            .att('currency', codeByCurrencys[_objects[i].expense[i1].name])
                            .att('value', _objects[i].expense[i1].value)
                    }
                }
                if(_objects[i].outCashbox.length>0&&(_objects[i].outCashbox.filter(element=>element.value>0)).length) {
                    outCashbox = item.ele('out_cashboxes')
                    for (let i1 = 0; i1 < _objects[i].outCashbox.length; i1++) {
                        outCashbox.ele('out_cashbox')
                            .att('currency', codeByCurrencys[_objects[i].outCashbox[i1].name])
                            .att('value', _objects[i].outCashbox[i1].value)
                    }
                }
                balanceEnd = item.ele('balance_ends')
                for(let i1 = 0; i1<_objects[i].balanceEnd.length; i1++) {
                    balanceEnd.ele('balance_end')
                        .att('currency', codeByCurrencys[_objects[i].balanceEnd[i1].name])
                        .att('value', _objects[i].balanceEnd[i1].value)
                }
                waybills = item.ele('waybills')
                for(let i1 = 0; i1<_objects[i].waybills.length; i1++) {
                    waybill = waybills.ele('waybill')
                        .att('seller', _objects[i].waybills[i1].seller)
                        .att('budget', _objects[i].waybills[i1].application.budget?1:0)
                        .att('payment_type', _objects[i].waybills[i1].application.paymentType)
                        .att('official', _objects[i].waybills[i1].application.official?1:0)
                        .att('comment', _objects[i].waybills[i1].application.comment)
                    for(let i2 = 0; i2<_objects[i].waybills[i1].items.length; i2++) {
                        waybill.ele('item')
                            .att('name', _objects[i].waybills[i1].items[i2].name)
                            .att('guid', _objects[i].waybills[i1].items[i2].GUID)
                            .att('unit', _objects[i].waybills[i1].items[i2].unit)
                            .att('price', _objects[i].waybills[i1].items[i2].price)
                            .att('count', _objects[i].waybills[i1].items[i2].count)
                            .att('amount', _objects[i].waybills[i1].items[i2].price*_objects[i].waybills[i1].items[i2].count)
                            .att('currency', codeByCurrencys[_objects[i].waybills[i1].items[i2].currency])
                            .att('comment', _objects[i].waybills[i1].items[i2].comment)
                    }
                }
                if(_objects[i].addedItems.length>0) {
                    waybill = waybills.ele('waybill')
                    for (let i1 = 0; i1 < _objects[i].addedItems.length; i1++) {
                        waybill.ele('item')
                            .att('name', _objects[i].addedItems[i1].name)
                            .att('guid', _objects[i].addedItems[i1].GUID)
                            .att('unit', _objects[i].addedItems[i1].unit)
                            .att('price', _objects[i].addedItems[i1].price)
                            .att('count', _objects[i].addedItems[i1].count)
                            .att('amount', _objects[i].addedItems[i1].price * _objects[i].addedItems[i1].count)
                            .att('currency', codeByCurrencys[_objects[i].addedItems[i1].currency])
                            .att('comment', _objects[i].addedItems[i1].comment)
                    }
                }
            }
        }
        result = result.end({ pretty: true})
        await res.status(200);
        await res.end(result)
    } catch (err) {
        _objects = new ModelsError({
            err: err.message,
            path: 'out expensereport'
        });
        await ModelsError.create(_objects)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/confirm/expensereport', async (req, res, next) => {
    res.set('Content+Type', 'application/xml');
    let _object
    try{
        let guids = req.body.elements[0].elements.map(element=>element.attributes.guid)
        for(let i=0;i<req.body.elements[0].elements.length;i++) {
            await ExpenseReport.updateMany({GUID: {$in: guids}}, {sync: 1})
        }
        await res.status(200);
        await res.end('success')
    } catch (err) {
        _object = new ModelsError({
            err: err.message,
            path: 'confirm expensereport'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.get('/out/cashexchange', async (req, res, next) => {
    let _objects = await CashExchange.find({sync: {$ne: 1}})
        .populate('supplier')
        .lean()
    try{
        let result = builder.create('root');
        for(let i=0;i<_objects.length;i++) {
            if(_objects[i].supplier.GUID&&_objects[i].supplier.GUID.length>0) {
                result.ele('item')
                    .att('supplier', _objects[i].supplier.GUID)
                    .att('guid', _objects[i].GUID)
                    .att('comment', _objects[i].comment)
                    .att('exchangeFrom', _objects[i].exchangeFrom)
                    .att('currencyTypeFrom', codeByCurrencys[_objects[i].currencyTypeFrom])
                    .att('exchangeTo', _objects[i].exchangeTo)
                    .att('currencyTypeTo', codeByCurrencys[_objects[i].currencyTypeTo])
                    .att('date', pdDDMMYYYY(_objects[i].createdAt))
            }
        }
        result = result.end({ pretty: true})
        await res.status(200);
        await res.end(result)
    } catch (err) {
        _objects = new ModelsError({
            err: err.message,
            path: 'out cashexchange'
        });
        await ModelsError.create(_objects)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/confirm/cashexchange', async (req, res, next) => {
    res.set('Content+Type', 'application/xml');
    let _object
    try{
        let guids = req.body.elements[0].elements.map(element=>element.attributes.guid)
        for(let i=0;i<req.body.elements[0].elements.length;i++) {
            await CashExchange.updateMany({GUID: {$in: guids}}, {sync: 1})
        }
        await res.status(200);
        await res.end('success')
    } catch (err) {
        _object = new ModelsError({
            err: err.message,
            path: 'confirm cashexchange'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

module.exports = router;