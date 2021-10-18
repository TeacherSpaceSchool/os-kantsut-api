const CashExchange = require('../models/cashExchange');
const ExpenseReport = require('../models/expenseReport');
const Balance = require('../models/balance');
const User = require('../models/user');
const {changeBalance} = require('./balance');
const randomstring = require('randomstring');
const { pubsub } = require('./index');
const RELOAD_DATA = 'RELOAD_DATA';
const { sendWebPushByRolesIds } = require('../module/webPush');
const ExcelJS = require('exceljs');
const app = require('../app');
const fs = require('fs');
const path = require('path');
const { urlMain, pdDDMMYYYY, checkFloat } = require('../module/const');
const uuidv1 = require('uuid/v1.js');

const type = `
  type CashExchange {
      _id: ID
      createdAt: Date
      number: String
      exchangeFrom: Float
      sync: Int
      currencyTypeFrom: String
      exchangeTo: Float
      currencyTypeTo: String
      exchangeRate: Float
      currencyTypeRate: String
      supplier: User
      comment: String
      note: [String]
 }
`;

const query = `
    cashExchanges(search: String!, date: String!, skip: Int!): [CashExchange]
    cashExchangesForExpenseReport: [CashExchange]
    cashExchange(_id: ID!): CashExchange
    unloadingCashExchange(_id: ID!): Data
`;

const mutation = `
    addCashExchange(exchangeFrom: Float!, currencyTypeFrom: String!, currencyTypeTo: String!, exchangeTo: Float!, comment: String!, note: [String]!): Data
    deleteCashExchange(_id: [ID]!): Data
`;

const resolvers = {
    cashExchangesForExpenseReport: async(parent, ctx, {user}) => {
        if(user.role==='снабженец'&&user.checkedPinCode) {
            let res = await ExpenseReport.findOne({supplier: user._id, status: 'принят'}).select('createdAt').sort('-createdAt')
            res = await CashExchange.find({
                supplier: user._id,
                ...res?{createdAt: {$gte: res.createdAt}}:{}
            })
                .sort('createdAt')
                .lean()
            return res
        }
    },
    cashExchanges: async(parent, {search, date, skip}, {user}) => {
        if(user.checkedPinCode) {
            let dateStart;
            let dateEnd;
            if (date !== '') {
                dateStart = new Date(date)
                dateStart.setHours(3, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let users
            if (search.length) {
                users = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            let cashExchanges = await CashExchange.find({
                ...user.role === 'снабженец'?{supplier: user._id}:{},
                ...search.length ? {
                    $or: [
                        {number: {'$regex': search, '$options': 'i'}},
                        {supplier: {$in: users}},
                    ]
                } : {},
                ...date !== '' ? {$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]} : {}
            })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .sort('-createdAt')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return cashExchanges
        }
    },
    cashExchange: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await CashExchange.findOne({
                _id: _id
            })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .lean()
        }
    },
    unloadingCashExchange: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            let cashExchange =  await CashExchange.findOne({
                _id: _id
            })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .lean()
            let workbook = new ExcelJS.Workbook();
            let worksheet;
            worksheet = await workbook.addWorksheet(`Документ на конвертацию денежных средств №${cashExchange.number}`);
            let row = 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `${process.env.URL.trim()}/cashexchange/${cashExchange._id}`;
            row += 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `Документ на конвертацию денежных средств №${cashExchange.number}`;
            row += 2;
            worksheet.getCell(`A${row}`).value = `Снабженец: ${cashExchange.supplier.name}`;
            if(cashExchange.comment&&cashExchange.comment.length) {
                row += 1;
                worksheet.getCell(`A${row}`).value = `Обоснование: ${cashExchange.comment}`;
            }
            row += 1;
            worksheet.getCell(`A${row}`).value = `Дата конвертации: ${pdDDMMYYYY(cashExchange.createdAt)}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `Продажа: ${cashExchange.exchangeFrom} ${cashExchange.currencyTypeFrom}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `Покупка: ${cashExchange.exchangeTo} ${cashExchange.currencyTypeTo}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `Курс: 1 ${cashExchange.currencyTypeRate!==cashExchange.currencyTypeFrom?cashExchange.currencyTypeFrom:cashExchange.currencyTypeTo} = ${cashExchange.exchangeRate} ${cashExchange.currencyTypeRate}`;

            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxdir = path.join(app.dirname, 'public', 'xlsx');
            if (!await fs.existsSync(xlsxdir)){
                await fs.mkdirSync(xlsxdir);
            }
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return({data: urlMain + '/xlsx/' + xlsxname})
        }
    },
};

const resolversMutation = {
    addCashExchange: async(parent, {exchangeFrom, currencyTypeFrom, currencyTypeTo, exchangeTo, comment, note}, {user}) => {
        if('снабженец'===user.role&&user.checkedPinCode){
            let balance = await Balance.findOne({supplier: user._id}).select('amount').lean()
            let index
            for(let i=0; i<balance.amount.length; i++){
                if(balance.amount[i].name===currencyTypeFrom)
                    index = i
            }
            if(balance&&balance.amount[index].value>=exchangeFrom&&currencyTypeFrom!==currencyTypeTo) {
                let number = randomstring.generate({length: 6, charset: 'numeric'});
                while (await CashExchange.findOne({number: number}).select('_id').lean())
                    number = randomstring.generate({length: 6, charset: 'numeric'});
                let currencyTypeRate
                let exchangeRate
                if(checkFloat(exchangeFrom)>checkFloat(exchangeTo)){
                    currencyTypeRate = currencyTypeFrom
                    exchangeRate = checkFloat(exchangeFrom/exchangeTo)
                }
                else {
                    currencyTypeRate = currencyTypeTo
                    exchangeRate = checkFloat(exchangeTo/exchangeFrom)
                }
                let newCashExchange = new CashExchange({
                    GUID: await uuidv1(),
                    supplier: user._id,
                    number,
                    exchangeFrom,
                    currencyTypeFrom,
                    exchangeTo,
                    currencyTypeTo,
                    exchangeRate,
                    currencyTypeRate,
                    comment,
                    note,
                    sync: 0
                });
                newCashExchange = await CashExchange.create(newCashExchange);
                await sendWebPushByRolesIds({
                    title: 'Кассовый расходник добавлен',
                    message: `Кассовый расходник №${newCashExchange.number} добавлен`,
                    url: `${process.env.URL.trim()}/cashexchange/${newCashExchange._id}`,
                    roles: ['admin', 'менеджер'],
                    _ids: [newCashExchange.supplier]
                })
                pubsub.publish(RELOAD_DATA, {
                    reloadData: {
                        type: 'ADD',
                        who: user._id,
                        ids: [newCashExchange.supplier],
                        roles: ['бухгалтерия', 'кассир', 'admin', 'менеджер'],
                        cashExchange: await CashExchange.findOne({
                            _id: newCashExchange._id
                        })
                            .populate({
                                path: 'supplier',
                                select: 'name _id'
                            })
                            .lean()
                    }
                });
                await changeBalance({
                    supplier: user._id,
                    currencyType: currencyTypeFrom,
                    addAmount: 0,
                    removeAmount: exchangeFrom
                })
                await changeBalance({
                    supplier: user._id,
                    currencyType: currencyTypeTo,
                    addAmount: exchangeTo,
                    removeAmount: 0
                })
            }
            return {data: 'OK'}
        }
    },
    deleteCashExchange: async(parent, {_id}, {user}) => {
        if(['admin', 'менеджер', 'бухгалтерия', 'кассир', 'снабженец'].includes(user.role)&&user.checkedPinCode) {
            for(let i = 0; i<_id.length; i++) {
                let cashExchange = await CashExchange.findById(_id[i]).lean()
                await changeBalance({
                    supplier: cashExchange.supplier,
                    currencyType: cashExchange.currencyTypeFrom,
                    addAmount: cashExchange.exchangeFrom,
                    removeAmount: 0
                })
                await changeBalance({
                    supplier: cashExchange.supplier,
                    currencyType: cashExchange.currencyTypeTo,
                    addAmount: 0,
                    removeAmount: cashExchange.exchangeTo
                })
                pubsub.publish(RELOAD_DATA, {
                    reloadData: {
                        type: 'DELETE',
                        who: user._id,
                        ids: [cashExchange.supplier],
                        roles: ['бухгалтерия', 'кассир', 'снабженец', 'admin', 'менеджер'],
                        cashExchange: {_id: cashExchange._id}
                    }
                });
                await CashExchange.deleteMany({_id: _id[i]})
            }
        }
        return {data: 'OK'}
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;