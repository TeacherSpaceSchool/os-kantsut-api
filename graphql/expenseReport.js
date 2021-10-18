const Application = require('../models/application');
const User = require('../models/user');
const ExpenseReport = require('../models/expenseReport');
const Division = require('../models/division');
const CashConsumable = require('../models/cashConsumable');
const CashExchange = require('../models/cashExchange');
const Balance = require('../models/balance');
const Waybill = require('../models/waybill');
const randomstring = require('randomstring');
const {changeBalance} = require('./balance');
const { pubsub } = require('./index');
const { checkFloat, pdDDMMYYYY, urlMain } = require('../module/const');
const RELOAD_DATA = 'RELOAD_DATA';
const { sendWebPushByRolesIds } = require('../module/webPush');
const ExcelJS = require('exceljs');
const app = require('../app');
const fs = require('fs');
const path = require('path');
const uuidv1 = require('uuid/v1.js');

const type = `
  type ExpenseReport {
    _id: ID
    sync: Int
    createdAt: Date
    status: String
    number: String
    dateClose: Date
    acceptHead: Date
    applications: [Application]
    waybills: [Waybill]
    cashExchanges: [CashExchange]
    cashConsumables: [CashConsumable]
    supplier: User
    balanceStart: [Currency]
    receivedAmount: [Currency]
    expense: [Currency]
    overExpense: [Currency]
    outCashbox: [Currency]
    balanceEnd: [Currency]
    addedItems: [UsedItems]
 }
`;

const query = `
    expenseReports(search: String!, filter: String!, sort: String!, date: String!, skip: Int!): [ExpenseReport]
    expenseReport(_id: ID!): ExpenseReport
    unloadingExpenseReport(_id: ID!): Data
`;

const mutation = `
    addExpenseReport(outCashbox: [InputCurrency]!, addedItems: [InputItems]!): Data
    setExpenseReport(_id: ID!, acceptHead: Date, ): Data
    deleteExpenseReport(_id: [ID]!): Data
`;

const resolvers = {
    expenseReports: async(parent, {search, filter, sort, date, skip}, {user}) => {
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
            let applications
            if (search.length) {
                users = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
                applications = await Application.find({
                    number: {
                        '$regex': search,
                        '$options': 'i'
                    }
                }).distinct('_id').lean()
            }
            let expenseReports
            if (!['admin', 'менеджер', 'снабженец'].includes(user.role)) {
                expenseReports = await Division.find({head: user._id}).distinct('suppliers').lean()
            }
            expenseReports = await ExpenseReport.find({
                ...!['admin', 'менеджер', 'снабженец'].includes(user.role)?{supplier: {$in: expenseReports}}:{},
                ...user.role === 'снабженец'?{supplier: user._id}:{},
                ...filter.length ? {status: filter} : {},
                ...search.length ? {
                    $or: [
                        {supplier: users},
                        {number: {'$regex': search, '$options': 'i'}},
                        {applications: {$in: applications}},
                    ]
                } : {},
                ...date !== '' ? {$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]} : {}
            })
                .select('_id number status createdAt acceptHead supplier sync')
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .sort(sort)
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return expenseReports
        }
    },
    expenseReport: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await ExpenseReport.findById(_id)
                .populate('applications')
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .populate('waybills')
                .populate('cashConsumables')
                .populate('cashExchanges')
                .lean()
        }
    },
    unloadingExpenseReport: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            let expenseReport = await ExpenseReport.findById(_id)
                .select('waybills number _id supplier balanceStart cashConsumables receivedAmount expense overExpense outCashbox balanceEnd acceptHead createdAt ')
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .populate({
                    path: 'waybills',
                    select: 'items _id application number createdAt',
                    populate: {
                        path: 'application',
                        select: '_id number division',
                        populate: {
                            path: 'division',
                            select: '_id name',
                        }
                    }
                })
                .populate({
                    path: 'cashExchanges',
                    select: '_id number createdAt exchangeFrom sync currencyTypeFrom exchangeTo currencyTypeTo currencyTypeRate exchangeRate'
                })
                .populate({
                    path: 'cashConsumables',
                    select: 'createdAt amount currencyType comment _id'
                })
                .lean()
            let items = expenseReport.waybills.reduce((accumulator, currentValue)=>[...accumulator, ...currentValue.items.map(item=>{return {division: currentValue.application.division.name, _id: currentValue._id, number: currentValue.number, createdAt: currentValue.createdAt, ...item}})], [])
            let workbook = new ExcelJS.Workbook();
            let worksheet;
            worksheet = await workbook.addWorksheet(`Авансовый отчет №${expenseReport.number}`);
            worksheet.getColumn(1).width = 10;
            worksheet.getColumn(2).width = 30;
            worksheet.getColumn(3).width = 10;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 10;
            worksheet.getColumn(6).width = 30;
            worksheet.getColumn(7).width = 30;
            worksheet.getColumn(8).width = 30;
            let row = 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `${process.env.URL.trim()}/expensereport/${expenseReport._id}`;
            row += 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `Авансовый отчет №${expenseReport.number}`;
            row += 2;
            worksheet.getCell(`A${row}`).value = `Снабженец: ${expenseReport.supplier.name}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `Дата: ${pdDDMMYYYY(expenseReport.createdAt)}`;
            row += 2;
            worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`A${row}`).value = 'Дата';
            worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`C${row}`).value = 'Кол-во';
            worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`D${row}`).value = 'Цена';
            worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`E${row}`).value = 'Сумма';
            worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`F${row}`).value = 'Коментарий';
            worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`G${row}`).value = 'Подразделение';
            worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`H${row}`).value = 'Ссылка';
            row += 1;
            for(let i = 0; i<expenseReport.balanceStart.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).value = 'Остаток на начало периода';
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `${expenseReport.balanceStart[i].value} ${expenseReport.balanceStart[i].name}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                row += 1;
            }
            for(let i = 0; i<expenseReport.cashConsumables.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`A${row}`).value = pdDDMMYYYY(expenseReport.cashConsumables[i].createdAt);
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).value = 'Получено из кассы';
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `${expenseReport.cashConsumables[i].amount} ${expenseReport.cashConsumables[i].currencyType}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`F${row}`).alignment = { wrapText: true };
                worksheet.getCell(`F${row}`).value = expenseReport.cashConsumables[i].comment;
                worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).alignment = { wrapText: true };
                worksheet.getCell(`H${row}`).value = `${process.env.URL.trim()}/cashconsumable/${expenseReport.cashConsumables[i]._id}`;
                row += 1;
            }
            for(let i = 0; i<expenseReport.cashExchanges.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`A${row}`).value = pdDDMMYYYY(expenseReport.cashExchanges[i].createdAt);
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).value = 'Конвертировано';
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`C${row}`).value = `${expenseReport.cashExchanges[i].exchangeFrom} ${expenseReport.cashExchanges[i].currencyTypeFrom}`;
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).value = `${expenseReport.cashExchanges[i].exchangeTo} ${expenseReport.cashExchanges[i].currencyTypeTo}`;
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `1 ${expenseReport.cashExchanges[i].currencyTypeRate!==expenseReport.cashExchanges[i].currencyTypeFrom?expenseReport.cashExchanges[i].currencyTypeFrom:expenseReport.cashExchanges[i].currencyTypeTo} = ${expenseReport.cashExchanges[i].exchangeRate} ${expenseReport.cashExchanges[i].currencyTypeRate}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`F${row}`).alignment = { wrapText: true };
                worksheet.getCell(`F${row}`).value = expenseReport.cashExchanges[i].comment;
                worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).alignment = { wrapText: true };
                worksheet.getCell(`H${row}`).value = `${process.env.URL.trim()}/cashexchange/${expenseReport.cashExchanges[i]._id}`;
                row += 1;
            }
            for(let i = 0; i<expenseReport.receivedAmount.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).value = 'Итого получено';
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `${expenseReport.receivedAmount[i].value} ${expenseReport.receivedAmount[i].name}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                row += 1;
            }
            worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            row += 1;
            for(let i = 0; i<items.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`A${row}`).value = pdDDMMYYYY(items[i].createdAt);
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).alignment = { wrapText: true };
                worksheet.getCell(`B${row}`).value = items[i].name;
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`C${row}`).value = `${items[i].count} ${items[i].unit}`;
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).value = `${items[i].price} ${items[i].currency}`;
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `${items[i].count*items[i].price} ${items[i].currency}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`F${row}`).alignment = { wrapText: true };
                worksheet.getCell(`F${row}`).value = items[i].comment;
                worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`G${row}`).alignment = { wrapText: true };
                worksheet.getCell(`G${row}`).value = items[i].division;
                worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).alignment = { wrapText: true };
                worksheet.getCell(`H${row}`).value = `${process.env.URL.trim()}/waybill/${items[i]._id}`;
                row += 1;
            }
            for(let i = 0; i<expenseReport.expense.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).value = 'Итого расход';
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `${expenseReport.expense[i].value} ${expenseReport.expense[i].name}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                row += 1;
            }
            worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            row += 1;
            if(expenseReport.overExpense.length){
                for(let i = 0; i<expenseReport.overExpense.length; i++){
                    worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`B${row}`).value = 'Перерасход';
                    worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`E${row}`).value = `${expenseReport.overExpense[i].value} ${expenseReport.overExpense[i].name}`;
                    worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    row += 1;
                }
            }
            if(expenseReport.outCashbox.length){
                for(let i = 0; i<expenseReport.outCashbox.length; i++){
                    worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`B${row}`).value = 'Сдано в кассу';
                    worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`E${row}`).value = `${expenseReport.outCashbox[i].value} ${expenseReport.outCashbox[i].name}`;
                    worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    row += 1;
                }
            }
            if(expenseReport.balanceEnd.length){
                for(let i = 0; i<expenseReport.balanceEnd.length; i++){
                    worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`B${row}`).value = 'Остаток на конец периода';
                    worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`E${row}`).value = `${expenseReport.balanceEnd[i].value} ${expenseReport.balanceEnd[i].name}`;
                    worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`G${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    worksheet.getCell(`H${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                    row += 1;
                }
            }
            if(expenseReport.acceptHead)
                worksheet.getCell(`A${row}`).value = `Принят ${pdDDMMYYYY(expenseReport.acceptHead)}`;


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
    addExpenseReport: async(parent, {outCashbox, addedItems}, {user}) => {
        if('снабженец'===user.role&&user.checkedPinCode) {
            let number = randomstring.generate({length: 6, charset: 'numeric'});
            while (await ExpenseReport.findOne({number: number}).select('_id').lean())
                number = randomstring.generate({length: 6, charset: 'numeric'});
            let lastExpenseReport = await ExpenseReport.findOne({supplier: user._id, status: 'принят'}).select('createdAt').sort('-createdAt')
            let applications = await Application.find({
                status: 'принят',
                supplier: user._id
            })
                .select('_id ')
                .sort('-createdAt')
                .lean()
            let waybills = await Waybill.find({
                status: 'принят',
                application: {$in: applications.map(application=>application._id)}
            }).select('amount _id').lean()
            let cashConsumables = await CashConsumable.find({supplier: user._id, ...lastExpenseReport?{createdAt: {$gte: lastExpenseReport.createdAt}}:{}})
                .select('_id currencyType amount')
                .lean()
            let cashExchanges = await CashExchange.find({supplier: user._id, ...lastExpenseReport?{createdAt: {$gte: lastExpenseReport.createdAt}}:{}})
                .sort('createdAt')
                .lean()
            let balance = await Balance.findOne({supplier: user._id}).select('amount').lean()

            let balanceEnd1 = {}, balanceEnd2 = {}, balanceEnd = []
            let balanceStart1 = {}, balanceStart = []
            balance = balance?balance.amount:[]
            for(let i = 0; i<balance.length; i++){
                balanceStart1[balance[i].name] = balance[i].value
                balanceEnd1[balance[i].name] = balance[i].value
            }
            for(let i = 0; i<waybills.length; i++){
                for(let i1 = 0; i1<waybills[i].amount.length; i1++) {
                    if (!balanceStart1[waybills[i].amount[i1].name]) {
                        balanceStart1[waybills[i].amount[i1].name] = 0
                        balanceEnd1[waybills[i].amount[i1].name] = 0
                    }
                }
            }
            for(let i = 0; i<addedItems.length; i++){
                if (balanceStart1[addedItems[i].currency]==undefined) {
                    balanceStart1[addedItems[i].currency] = 0
                    balanceEnd1[addedItems[i].currency] = 0
                }
            }

            let keys, receivedAmount1 = {}, receivedAmount = []
            for (let i = 0; i < cashExchanges.length; i++) {
                if (receivedAmount1[cashExchanges[i].currencyTypeFrom] == undefined)
                    receivedAmount1[cashExchanges[i].currencyTypeFrom] = 0
                receivedAmount1[cashExchanges[i].currencyTypeFrom] -= cashExchanges[i].exchangeFrom

                if (receivedAmount1[cashExchanges[i].currencyTypeTo] == undefined)
                    receivedAmount1[cashExchanges[i].currencyTypeTo] = 0
                receivedAmount1[cashExchanges[i].currencyTypeTo] += cashExchanges[i].exchangeTo
            }
            for (let i = 0; i < cashConsumables.length; i++) {
                if (receivedAmount1[cashConsumables[i].currencyType] == undefined)
                    receivedAmount1[cashConsumables[i].currencyType] = 0
                receivedAmount1[cashConsumables[i].currencyType] += cashConsumables[i].amount
            }
            keys = Object.keys(receivedAmount1)
            for (let i = 0; i < keys.length; i++) {
                if(receivedAmount1[keys[i]]>=0)
                    receivedAmount.push({name: keys[i], value: receivedAmount1[keys[i]]})
                else
                    receivedAmount.push({name: keys[i], value: 0})
                balanceStart1[keys[i]] -= receivedAmount1[keys[i]]
                balanceStart.push({name: keys[i], value: checkFloat(balanceStart1[keys[i]])})
            }
            for (let i = 0; i < waybills.length; i++) {
                for (let i1 = 0; i1 < waybills[i].amount.length; i1++) {
                    if (
                        (cashExchanges.length||cashConsumables.length)&&receivedAmount1[waybills[i].amount[i1].name] == undefined
                        ||
                        !(balanceStart.filter(element=>element.name===waybills[i].amount[i1].name)).length
                    ) {
                        balanceStart.push({
                            name: waybills[i].amount[i1].name,
                            value: checkFloat(balanceStart1[waybills[i].amount[i1].name])
                        })
                    }
                }
            }
            for (let i = 0; i < addedItems.length; i++) {
                if (
                    (cashExchanges.length||cashConsumables.length)&&receivedAmount1[addedItems[i].currency] == undefined
                    ||
                    !(balanceStart.filter(element=>element.name===addedItems[i].currency)).length
                ) {
                    balanceStart.push({
                        name: addedItems[i].currency,
                        value: checkFloat(balanceStart1[addedItems[i].currency])
                    })
                }
            }

            let overExpense = []
            let expense1 = {}, expense = []
            for(let i = 0; i<waybills.length; i++){
                for(let i1 = 0; i1<waybills[i].amount.length; i1++) {
                    if (!expense1[waybills[i].amount[i1].name])
                        expense1[waybills[i].amount[i1].name] = 0
                    expense1[waybills[i].amount[i1].name]+=waybills[i].amount[i1].value
                }
            }
            for(let i = 0; i<addedItems.length; i++){
                if (expense1[addedItems[i].currency]==undefined)
                    expense1[addedItems[i].currency] = 0
                expense1[addedItems[i].currency]+=addedItems[i].price*addedItems[i].count
            }

            let outCashbox1 = {}
            for(let i = 0; i<outCashbox.length; i++){
                outCashbox1[outCashbox[i].name] = outCashbox[i].value
            }

            keys = Object.keys(expense1)
            for(let i = 0; i<keys.length; i++){
                balanceEnd1[keys[i]] -= expense1[keys[i]]
                expense.push({name: keys[i], value: expense1[keys[i]]})
                balanceEnd2[keys[i]] = balanceEnd1[keys[i]]
            }
            keys = Object.keys(outCashbox1)
            for (let i = 0; i < keys.length; i++) {
                balanceEnd1[keys[i]] -= outCashbox1[keys[i]]
                balanceEnd2[keys[i]] = balanceEnd1[keys[i]]
            }
            keys = Object.keys(balanceEnd2)
            for(let i = 0; i<keys.length; i++){
                if(balanceEnd2[keys[i]]<0)
                    overExpense.push({name: keys[i], value: balanceEnd2[keys[i]]})
                balanceEnd.push({name: keys[i], value: balanceEnd2[keys[i]]})
            }

            let newExpenseReport = new ExpenseReport({
                sync: 0,
                status: 'обработка',
                number: number,
                applications: applications.map(application=>application._id),
                waybills: waybills.map(waybill=>waybill._id),
                cashConsumables: cashConsumables.map(cashConsumable=>cashConsumable._id),
                cashExchanges: cashExchanges.map(cashExchange=>cashExchange._id),
                supplier: user._id,
                addedItems: addedItems.sort((a, b)=>a.name > b.name?1:a.name < b.name?-1:0),
                balanceStart: balanceStart.sort((a, b)=>a.name > b.name?1:a.name < b.name?-1:0),
                receivedAmount: receivedAmount.sort((a, b)=>a.name > b.name?1:a.name < b.name?-1:0),
                expense: expense.sort((a, b)=>a.name > b.name?1:a.name < b.name?-1:0),
                overExpense: overExpense.sort((a, b)=>a.name > b.name?1:a.name < b.name?-1:0),
                outCashbox: outCashbox.sort((a, b)=>a.name > b.name?1:a.name < b.name?-1:0),
                balanceEnd: balanceEnd.sort((a, b)=>a.name > b.name?1:a.name < b.name?-1:0),
                GUID: await uuidv1()
            });
            newExpenseReport = await ExpenseReport.create(newExpenseReport);

            await sendWebPushByRolesIds({title: 'Авансовый отчет добавлен', message: `Авансовый отчет №${newExpenseReport.number} добавлен`, url: `${process.env.URL.trim()}/expensereport/${newExpenseReport._id}`, roles: ['admin', 'менеджер', 'начальник отдела'], _ids: []} )

            pubsub.publish(RELOAD_DATA, { reloadData: {
                type: 'ADD',
                who: user._id,
                ids: [newExpenseReport.supplier],
                roles: ['admin', 'менеджер', 'начальник отдела'],
                application: undefined,
                cashConsumable: undefined,
                waybill: undefined,
                expenseReport: await ExpenseReport.findById(newExpenseReport._id)
                    .select('_id number status createdAt acceptHead supplier sync')
                    .populate({
                        path: 'supplier',
                        select: 'name _id'
                    })
                    .lean(),
                balance: undefined,
            } });
            return {data: 'OK'}
        }
    },
    setExpenseReport: async(parent, {_id, acceptHead}, {user}) => {
        if(/*['admin', 'менеджер', 'начальник отдела'].includes(user.role)&&*/user.checkedPinCode) {
            let object = await ExpenseReport.findById(_id).populate('waybills')
            if (acceptHead) {
                object.acceptHead = new Date()
                let allExpense = {}
                for(let i = 0; i<object.expense.length; i++){
                    if (!allExpense[object.expense[i].name])
                        allExpense[object.expense[i].name] = 0
                    allExpense[object.expense[i].name]+=object.expense[i].value
                }
                for(let i = 0; i<object.outCashbox.length; i++){
                    if (!allExpense[object.outCashbox[i].name])
                        allExpense[object.outCashbox[i].name] = 0
                    allExpense[object.outCashbox[i].name]+=object.outCashbox[i].value
                }

                let keys = Object.keys(allExpense)
                for(let i = 0; i<keys.length; i++){
                    await changeBalance({supplier: object.supplier, currencyType: keys[i], addAmount: 0, removeAmount: allExpense[keys[i]]})
                }

                object.status = 'принят'
                object.dateClose = new Date()
                await Application.updateMany({_id: {$in: object.applications}}, {status: 'выполнен', dateClose: new Date()})
            }
            await object.save();

            if (object.status === 'принят') {
                await sendWebPushByRolesIds({
                    title: 'Авансовый отчет принят',
                    message: `Авансовый отчет №${object.number} принят`,
                    url: `${process.env.URL.trim()}/expensereport/${object._id}`,
                    roles: ['admin', 'менеджер'],
                    _ids: [object.supplier]
                })
            }
            else {
                await sendWebPushByRolesIds({
                    title: 'Авансовый отчет изменен',
                    message: `Авансовый отчет №${object.number} изменен`,
                    url: `${process.env.URL.trim()}/expensereport/${object._id}`,
                    roles: ['admin', 'менеджер', 'начальник отдела'],
                    _ids: []
                })
            }

            pubsub.publish(RELOAD_DATA, {
                reloadData: {
                    type: 'SET',
                    who: user._id,
                    ids: [object.supplier],
                    roles: ['admin', 'менеджер', 'начальник отдела'],
                    application: undefined,
                    cashConsumable: undefined,
                    waybill: undefined,
                    expenseReport: await ExpenseReport.findById(object._id)
                        .select('_id number status createdAt acceptHead supplier sync')
                        .populate({
                            path: 'supplier',
                            select: 'name _id'
                        })
                        .lean(),
                    balance: undefined,
                }
            });
        }
        return {data: 'OK'}
    },
    deleteExpenseReport: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер', 'снабженец'].includes(user.role)&&user.checkedPinCode) {
            let expenseReports = await ExpenseReport.find({_id: {$in: _id}}).select('_id supplier').lean()
            for (let i = 0; i < expenseReports.length; i++) {
                pubsub.publish(RELOAD_DATA, {
                    reloadData: {
                        type: 'DELETE',
                        who: user._id,
                        ids: [expenseReports[i].supplier],
                        roles: ['admin', 'менеджер', 'начальник отдела'],
                        application: undefined,
                        cashConsumable: undefined,
                        waybill: undefined,
                        expenseReport: {_id: expenseReports[i]._id},
                        balance: undefined,
                    }
                });
            }
            await ExpenseReport.deleteMany({_id: {$in: _id}})
        }
        return {data: 'OK'}
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;