const Application = require('../models/application');
const User = require('../models/user');
const Waybill = require('../models/waybill');
const Item = require('../models/item');
const randomstring = require('randomstring');
const { pdDDMMYYYY, checkFloat, urlMain } = require('../module/const');
const { pubsub } = require('./index');
const RELOAD_DATA = 'RELOAD_DATA';
const { sendWebPushByRolesIds } = require('../module/webPush');
const ExcelJS = require('exceljs');
const app = require('../app');
const fs = require('fs');
const path = require('path');

const type = `
  type Waybill {
    _id: ID
    createdAt: Date
    status: String
    number: String
    dateClose: Date
    acceptSpecialist: Date
    application: Application
    seller: String
    patent: [String]
    specialist: User
    supplier: User
    comment: String
    items: [UsedItems]
    amount: [Currency]
 }
`;

const query = `
    waybills(search: String!, filter: String!, sort: String!, date: String!, skip: Int!): [Waybill]
    waybillsForExpenseReport: [Waybill]
    waybill(_id: ID!): Waybill
    unloadingWaybill(_id: ID!): Data
`;

const mutation = `
    addWaybill(application: ID!, seller: String!, patent: [String], items: [InputItems]!): Data
    setWaybill(_id: ID!, comment: String, acceptSpecialist: Date, seller: String, patent: [String], items: [InputItems]): Data
    deleteWaybill(_id: [ID]!): Data
`;

const resolvers = {
    waybillsForExpenseReport: async(parent, ctx, {user}) => {
        if(user.role==='снабженец'&&user.checkedPinCode) {
            let res = await Application.find({
                status: 'принят',
                supplier: user._id
            }).distinct('_id')
            res = await Waybill.find({
                status: 'принят',
                application: {$in: res}
            })
                .select('_id amount items number createdAt')
                .sort('createdAt')
                .lean()
            return res
        }
    },
    waybills: async(parent, {search, filter, sort, date, skip}, {user}) => {
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
                applications = await Application.find({number: {'$regex': search,'$options': 'i'}}).distinct('_id').lean()
            }
            let waybills
            waybills = await Waybill.find({
                ...user.addApplication?{specialist: user._id}:{},
                ...user.role === 'снабженец'?{supplier: user._id}:{},
                ...filter.length ? {status: filter} : {},
                ...search.length ? {
                    $or: [
                        {number: {'$regex': search, '$options': 'i'}},
                        {specialist: {$in: users}},
                        {supplier: {$in: users}},
                        {items: {$elemMatch: {name: {'$regex': search, '$options': 'i'}}}},
                        {application: {$in: applications}}
                    ]
                } : {},
                ...date !== '' ? {$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]} : {}
            })
                .select('_id number status createdAt acceptSpecialist application supplier specialist amount')
                .populate({
                    path: 'specialist',
                    select: 'name _id'
                })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .populate({
                    path: 'application',
                    select: 'number _id'
                })
                .sort(sort)
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return waybills
        }
    },
    waybill: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await Waybill.findOne({
                _id: _id
            })
                .populate({
                    path: 'specialist',
                    select: 'name _id'
                })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .populate({
                    path: 'application',
                    select: 'number _id'
                })
                .lean()
        }
        else return null
    },
    unloadingWaybill: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            let waybill = await Waybill.findOne({
                _id: _id
            })
                .select('_id number supplier specialist createdAt comment seller items acceptSpecialist')
                .populate({
                    path: 'specialist',
                    select: 'name _id'
                })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .populate({
                    path: 'application',
                    select: 'number _id'
                })
                .lean()
            let workbook = new ExcelJS.Workbook();
            let worksheet;
            worksheet = await workbook.addWorksheet(`Накладная №${waybill.number}`);
            worksheet.getColumn(1).width = 5;
            worksheet.getColumn(2).width = 30;
            worksheet.getColumn(3).width = 10;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 10;
            worksheet.getColumn(6).width = 30;
            worksheet.getColumn(7).width = 15;
            let row = 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `${process.env.URL.trim()}/waybill/${waybill._id}`;
            row += 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `Накладная №${waybill.number}`;
            row += 2;
            worksheet.getCell(`A${row}`).value = `Отправитель: ${waybill.supplier.name}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `Получатель: ${waybill.specialist.name}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `Дата: ${pdDDMMYYYY(waybill.createdAt)}`;
            if(waybill.comment&&waybill.seller.length) {
                row += 1;
                worksheet.getCell(`A${row}`).value = `Продавец: ${waybill.seller}`;
            }
            row += 2;
            worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`A${row}`).value = '№';
            worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`B${row}`).value = 'ТМЦ';
            worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`C${row}`).value = 'Кол-во';
            worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`D${row}`).value = 'Цена';
            worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`E${row}`).value = 'Сумма';
            worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`F${row}`).value = 'Коментарий';
            row += 1;
            for(let i = 0; i<waybill.items.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`A${row}`).value = i+1;
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).alignment = { wrapText: true };
                worksheet.getCell(`B${row}`).value = waybill.items[i].name;
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`C${row}`).value = `${waybill.items[i].count} ${waybill.items[i].unit}`;
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).value = `${waybill.items[i].price} ${waybill.items[i].currency}`;
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `${waybill.items[i].count*waybill.items[i].price} ${waybill.items[i].currency}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`F${row}`).alignment = { wrapText: true };
                worksheet.getCell(`F${row}`).value = waybill.items[i].comment;
                row += 1;
            }
            if(waybill.acceptSpecialist)
                worksheet.getCell(`A${row}`).value = `Принят ${pdDDMMYYYY(waybill.acceptSpecialist)}`;


            let xlsxname = `${randomstring.generate(20)}.xlsx`;
            let xlsxdir = path.join(app.dirname, 'public', 'xlsx');
            if (!await fs.existsSync(xlsxdir)){
                await fs.mkdirSync(xlsxdir);
            }
            let xlsxpath = path.join(app.dirname, 'public', 'xlsx', xlsxname);
            await workbook.xlsx.writeFile(xlsxpath);
            return({data: urlMain + '/xlsx/' + xlsxname})
        }
        else return null
    }
};

const resolversMutation = {
    addWaybill: async(parent, {application, seller, patent, items}, {user}) => {
        if('снабженец'===user.role&&user.checkedPinCode) {
            let number = randomstring.generate({length: 6, charset: 'numeric'});
            while (await Waybill.findOne({number: number}).select('_id').lean())
                number = randomstring.generate({length: 6, charset: 'numeric'});
            application = await Application.findById(application).select('_id specialist supplier').lean()
            let amount1 = {}, amount = [], item, seted, lastPrice
            for(let i = 0; i<items.length; i++){
                if(items[i].status!=='отмена') {
                    if (!amount1[items[i].currency])
                        amount1[items[i].currency] = 0
                    amount1[items[i].currency]+=items[i].count*items[i].price
                    item =  await Item.findOne({GUID: items[i].GUID})
                    seted = false
                    if(item&&items[i].price){
                        if(!Array.isArray(item.lastPrice))
                            item.lastPrice = []
                        lastPrice = [...item.lastPrice]
                        for(let i1 = 0; i1<lastPrice.length; i1++) {
                            if(lastPrice[i1].name===items[i].currency){
                                lastPrice[i1].value = items[i].price
                                seted = true
                            }
                        }
                        if(!seted)
                            lastPrice.push({name: items[i].currency, value: checkFloat(items[i].price)})
                        item.lastPrice = lastPrice
                        await item.save()
                    }
                }
            }
            const keys = Object.keys(amount1)
            for(let i = 0; i<keys.length; i++){
                amount.push({name: keys[i], value: checkFloat(amount1[keys[i]])})
            }
            let newWaybill = new Waybill({
                number: number,
                application: application._id,
                seller: seller,
                specialist: application.specialist,
                supplier: application.supplier,
                items: items,
                status: 'обработка',
                amount: amount,
                patent: patent
            });
            newWaybill = await Waybill.create(newWaybill);
            await sendWebPushByRolesIds({title: 'Накладная добавлена', message: `Накладная №${newWaybill.number} добавлена`, url: `${process.env.URL.trim()}/waybill/${newWaybill._id}`, roles: ['admin', 'менеджер'], _ids: [newWaybill.specialist]} )
            pubsub.publish(RELOAD_DATA, { reloadData: {
                type: 'ADD',
                who: user._id,
                ids: [newWaybill.supplier, newWaybill.specialist],
                roles: ['admin', 'менеджер'],
                application: undefined,
                cashConsumable: undefined,
                waybill: await Waybill.findOne({
                    _id: newWaybill._id
                })
                    .select('_id number status createdAt acceptSpecialist application supplier specialist amount')
                    .populate({
                        path: 'specialist',
                        select: 'name _id'
                    })
                    .populate({
                        path: 'supplier',
                        select: 'name _id'
                    })
                    .populate({
                        path: 'application',
                        select: 'number _id'
                    })
                    .lean(),
                expenseReport: undefined,
                balance: undefined,
            } });
            return {data: 'OK'}
        }
    },
    setWaybill: async(parent, {_id, comment, acceptSpecialist, seller, patent, items}, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&user.checkedPinCode) {
            let object = await Waybill.findById(_id)
            if(comment){
                object.comment = comment
            }
            if (acceptSpecialist) {
                object.acceptSpecialist = new Date()
            }
            if (seller) {
                object.seller = seller
            }
            if (patent) object.patent = patent
            if (object.acceptSpecialist && object.status !== 'принят') {
                object.status = 'принят'
                object.dateClose = new Date()
                await sendWebPushByRolesIds({
                    title: 'Накладная принята',
                    message: `Накладная №${object.number} принята`,
                    url: `${process.env.URL.trim()}/waybill/${object._id}`,
                    roles: ['admin', 'менеджер'],
                    _ids: [object.supplier]
                })
            }
            else {
                let _ids = []
                if (object.specialist.toString() !== user._id.toString()) _ids.push(object.specialist)
                if (object.supplier.toString() !== user._id.toString()) _ids.push(object.supplier)
                await sendWebPushByRolesIds({
                    title: 'Накладная изменена',
                    message: `Накладная №${object.number} изменена`,
                    url: `${process.env.URL.trim()}/waybill/${object._id}`,
                    roles: ['admin', 'менеджер'],
                    _ids: _ids
                })
            }
            let amount1 = {}, amount = []
            for(let i = 0; i<items.length; i++){
                if(items[i].status!=='отмена') {
                    if (!amount1[items[i].currency])
                        amount1[items[i].currency] = 0
                    amount1[items[i].currency]+=items[i].count*items[i].price
                }
            }
            const keys = Object.keys(amount1)
            for(let i = 0; i<keys.length; i++){
                amount.push({name: keys[i], value: amount1[keys[i]]})
            }
            object.items = items
            await object.save();
            pubsub.publish(RELOAD_DATA, {
                reloadData: {
                    type: 'SET',
                    who: user._id,
                    ids: [object.supplier, object.specialist],
                    roles: ['admin', 'менеджер'],
                    application: undefined,
                    cashConsumable: undefined,
                    waybill: await Waybill.findOne({
                        _id: object._id
                    })
                        .select('_id number status createdAt acceptSpecialist application supplier specialist amount')
                        .populate({
                            path: 'specialist',
                            select: 'name _id'
                        })
                        .populate({
                            path: 'supplier',
                            select: 'name _id'
                        })
                        .populate({
                            path: 'application',
                            select: 'number _id'
                        })
                        .lean(),
                    expenseReport: undefined,
                    balance: undefined,
                }
            });
        }
        return {data: 'OK'}
    },
    deleteWaybill: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер', 'снабженец'].includes(user.role)&&user.checkedPinCode) {
            let waybills = await Waybill.find({_id: {$in: _id}}).select('_id supplier specialist').lean()
            for (let i = 0; i < waybills.length; i++) {
                pubsub.publish(RELOAD_DATA, {
                    reloadData: {
                        type: 'DELETE',
                        who: user._id,
                        ids: [waybills[i].supplier, waybills[i].specialist],
                        roles: ['admin', 'менеджер'],
                        application: undefined,
                        cashConsumable: undefined,
                        waybill: {_id: waybills[i]._id},
                        expenseReport: undefined,
                        balance: undefined,
                    }
                });
            }
            await Waybill.deleteMany({_id: {$in: _id}})
            return {data: 'OK'}
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;