const ApplicationCantSyt = require('../models/applicationCantSyt');
const UserCantSyt = require('../models/userCantSyt');
const RouteCantSyt = require('../models/routeCantSyt');
const DivisionCantSyt = require('../models/divisionCantSyt');
const CategoryCantSyt = require('../models/categoryCantSyt');
const SettingCantSyt = require('../models/settingCantSyt');
const mongoose = require('mongoose')
const randomstring = require('randomstring');
const { saveFile, urlMain, pdDDMMYYYY } = require('../module/const');
const { pubsub } = require('./index');
const { sendWebPushByRolesIds } = require('../module/webPush');
const RELOAD_DATA = 'RELOAD_DATA';
const ExcelJS = require('exceljs');
const app = require('../app');
const fs = require('fs');
const path = require('path');

const type = `
  type Application {
    _id: ID
    createdAt: Date
    status: String
    number: String
    division: Division
    subdivision: String
    category: Category
    budget: Boolean
    note: String
    paymentType: String
    comment: String
    official: Boolean
    dateClose: Date
    term: Date
    amount: [Currency]
    specialist: User
    supplier: User
    items: [UsedItems]
    routes: [UsedRoutes]
  }
`;

const query = `
    itemsFromApplications: [[String]]
    applications(search: String!, filter: String!, sort: String!, date: String!, dateEnd: String, supplier: ID, skip: Int!): [Application]
    applicationsForWaybill: [Application]
    application(_id: ID!): Application
    filterApplication: [Filter]
    sortApplication: [Sort]
    unloadingApplication(_id: ID!): Data
`;

const mutation = `
    addApplication(category: ID!, division: ID!, subdivision: String, comment: String!, items: [InputItems]!, note: Upload, budget: Boolean, paymentType: String, official: Boolean): Data
    setApplication(_id: ID!, comment: String, note: Upload, budget: Boolean, paymentType: String, official: Boolean, supplier: ID, items: [InputItems], routes: [InputRoutes]): Data
    deleteApplication(_id: [ID]!): Data
`;

const resolvers = {
    applicationsForWaybill: async(parent, ctx, {user}) => {
        if(user.role==='??????????????????') {
            let res = await ApplicationCantSyt.find({
                status: '????????????',
                supplier: user._id,
            })
                .populate('specialist')
                .populate('supplier')
                .populate('division')
                .populate('category')
                .sort('-createdAt')
                .lean()
            return res
        }
    },
    applications: async(parent, {search, filter, sort, date, skip, dateEnd, supplier}, {user}) => {
        let dateStart;
        if(date!==''&&!supplier){
            dateStart = new Date(date)
            dateStart.setHours(3, 0, 0, 0)
            dateEnd = new Date(dateStart)
            dateEnd.setDate(dateEnd.getDate() + 1)
        }
        else {
            dateStart = new Date(date)
            dateEnd = new Date(dateEnd)
        }
        let users
        let divisions
        let categorys
        if(search.length){
            users = await UserCantSyt.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            divisions = await DivisionCantSyt.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            categorys = await CategoryCantSyt.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
        }
        let applications
        if(user.role==='????????????????????'){
            applications = await ApplicationCantSyt.find({
                specialist: user._id,
                ...filter.length?{status: filter}:{},
                ...search.length?{
                    $or: [
                        {number: {'$regex': search, '$options': 'i'}},
                        {supplier: {$in: users}},
                        {division: {$in: divisions}},
                        {category: {$in: categorys}},
                        {items: {$elemMatch: {name: {'$regex': search, '$options': 'i'}}}},
                    ]
                }:{},
                ...date!==''?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
            })
                .populate('specialist')
                .populate('supplier')
                .populate('division')
                .populate('category')
                .sort(sort)
                .skip(skip!=undefined?skip:0)
                .limit(skip!=undefined?15:10000000000)
                .lean()
        }
        else if(user.role==='??????????????????'){
            applications = await ApplicationCantSyt.find({
                supplier: user._id,
                ...filter.length?{status: filter}:{},
                ...search.length?{
                    $or: [
                        {number: {'$regex': search, '$options': 'i'}},
                        {specialist: {$in: users}},
                        {division: {$in: divisions}},
                        {category: {$in: categorys}},
                        {items: {$elemMatch: {name: {'$regex': search, '$options': 'i'}}}},
                    ]
                }:{},
                ...date!==''?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
            })
                .populate('specialist')
                .populate('supplier')
                .populate('division')
                .populate('category')
                .sort(sort)
                .skip(skip!=undefined?skip:0)
                .limit(skip!=undefined?15:10000000000)
                .lean()
        }
        else if(['admin', '????????????????'].includes(user.role)){
            applications = await ApplicationCantSyt.find({
                ...filter.length?{status: filter}:{},
                ...supplier?{supplier: supplier}:{},
                ...search.length?{
                    $or: [
                        {number: {'$regex': search, '$options': 'i'}},
                        {specialist: {$in: users}},
                        ...supplier?[]:[{supplier: {$in: users}}],
                        {division: {$in: divisions}},
                        {category: {$in: categorys}},
                        {items: {$elemMatch: {name: {'$regex': search, '$options': 'i'}}}},
                    ]
                }:{},
                ...date!==''?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
            })
                .populate('specialist')
                .populate('supplier')
                .populate('division')
                .populate('category')
                .sort(sort)
                .skip(skip!=undefined?skip:0)
                .limit(skip!=undefined?15:10000000000)
                .lean()
        }
        else {
            let divisions = await DivisionCantSyt.find({staffs: user._id}).distinct('_id').lean()
            applications = await ApplicationCantSyt.find({
                ...divisions.length?{division: {$in: divisions}}:{},
                routes: {$elemMatch: {role: user.role}},
                ...filter.length?{status: filter}:{},
                ...search.length?{
                    $or: [
                        {number: {'$regex': search, '$options': 'i'}},
                        {specialist: {$in: users}},
                        {supplier: {$in: users}},
                        {division: {$in: divisions}},
                        {category: {$in: categorys}},
                        {items: {$elemMatch: {name: {'$regex': search, '$options': 'i'}}}},
                    ]
                }:{},
                ...date!==''?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{}
            })
                .populate('specialist')
                .populate('supplier')
                .populate('division')
                .populate('category')
                .sort(sort)
                .skip(skip!=undefined?skip:0)
                .limit(skip!=undefined?15:10000000000)
                .lean()
        }

        return applications
    },
    itemsFromApplications: async(parent, ctx, {user}) => {
        if(user.role==='??????????????????') {
            let res = []
            let applications = await ApplicationCantSyt.find({
                status: '????????????',
                supplier: user._id
            }).lean()
            for(let i = 0; i<applications.length; i++){
                for(let i1 = 0; i1<applications[i].items.length; i1++){
                    res.push([applications[i]._id, applications[i].number, applications[i].items[i1].name, `${applications[i].items[i1].count} ${applications[i].items[i1].unit}`])
                }
            }
            return res
        }
    },
    application: async(parent, {_id}) => {
        if(mongoose.Types.ObjectId.isValid(_id)) {
            return await ApplicationCantSyt.findOne({
                _id: _id
            })
                .populate('specialist')
                .populate('supplier')
                .populate({
                    path : 'division',
                    populate: [
                        {
                            path: 'suppliers'
                        }
                    ]
                })
                .populate('category')
                .lean()
        }
        else return null
    },
    filterApplication: async() => {
        let filters = [
            {
                name: '??????',
                value: ''
            },
            {
                name: '??????????????????',
                value: '??????????????????'
            },
            {
                name: '????????????',
                value: '????????????'
            },
            {
                name: '??????????????',
                value: '??????????????'
            },
            {
                name: '????????????????',
                value: '????????????????'
            },
            {
                name: '????????????',
                value: '????????????'
            }
        ]
        return filters
    },
    sortApplication: async() => {
        let sorts = [
            {
                name: '???????? ????????????????',
                field: 'createdAt'
            },
            {
                name: '????????',
                field: 'term'
            },
            {
                name: '???????? ????????????????',
                field: 'dateClose'
            },
        ]
        return sorts
    },
    unloadingApplication: async(parent, {_id}) => {
        if(mongoose.Types.ObjectId.isValid(_id)) {
            let application =  await ApplicationCantSyt.findOne({
                _id: _id
            })
                .populate('specialist')
                .populate('supplier')
                .populate({
                    path : 'division',
                    populate: [
                        {
                            path: 'suppliers'
                        }
                    ]
                })
                .populate('category')
                .lean()
            let workbook = new ExcelJS.Workbook();
            let worksheet;
            worksheet = await workbook.addWorksheet(`???????????? ???? ?????????? ???${application.number}`);
            worksheet.getColumn(1).width = 5;
            worksheet.getColumn(2).width = 30;
            worksheet.getColumn(3).width = 10;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 10;
            worksheet.getColumn(6).width = 30;
            worksheet.getColumn(7).width = 15;
            let row = 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `????????????: ${process.env.URL.trim()}/application/${application._id}`;
            row += 1;
            worksheet.getCell(`C${row}`).font = {bold: true};
            worksheet.getCell(`C${row}`).value = `???????????? ???? ?????????? ???${application.number}`;
            row += 2;
            worksheet.getCell(`A${row}`).value = `??????????????????????????: ${application.division.name}${application.subdivision&&application.subdivision.length?`|${application.subdivision}`:''}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `????????????????????: ${application.specialist.name}`;
            row += 1;
            worksheet.getCell(`A${row}`).value = `????????: ${pdDDMMYYYY(application.createdAt)}`;
            if(application.term) {
                worksheet.getCell(`D${row}`).value = `????????: ${pdDDMMYYYY(application.term)}`;
            }
            if(application.comment&&application.comment.length) {
                row += 1;
                worksheet.getCell(`A${row}`).value = `??????????????????????: ${application.comment}`;
            }
            row += 2;
            worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`A${row}`).value = '???';
            worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`B${row}`).value = '??????';
            worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`C${row}`).value = '??????-????';
            worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`D${row}`).value = '????????';
            worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`E${row}`).value = '??????????';
            worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
            worksheet.getCell(`F${row}`).value = '????????????????????';
            row += 1;
            for(let i = 0; i<application.items.length; i++){
                worksheet.getCell(`A${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`A${row}`).value = i+1;
                worksheet.getCell(`B${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`B${row}`).alignment = { wrapText: true };
                worksheet.getCell(`B${row}`).value = application.items[i].name;
                worksheet.getCell(`C${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`C${row}`).value = `${application.items[i].count} ${application.items[i].unit}`;
                worksheet.getCell(`D${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`D${row}`).value = `${application.items[i].price} ${application.items[i].currency}`;
                worksheet.getCell(`E${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`E${row}`).value = `${application.items[i].count*application.items[i].price} ${application.items[i].currency}`;
                worksheet.getCell(`F${row}`).border = {top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}};
                worksheet.getCell(`F${row}`).alignment = { wrapText: true };
                worksheet.getCell(`F${row}`).value = application.items[i].comment;
                row += 1;
            }
            row += 1;
            for(let i = 0; i<application.routes.length; i++){
                worksheet.getCell(`A${row}`).value = `${application.routes[i].role}: ${application.routes[i].confirmation?`???????????? ${pdDDMMYYYY(application.routes[i].confirmation)}`:application.routes[i].cancel?`???????????? ${pdDDMMYYYY(application.routes[i].cancel)}`:'??????????????????'}`;
                row += 1;
            }


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
    },
};

const resolversMutation = {
    addApplication: async(parent, {category, division, subdivision, items, comment, note, budget, paymentType, official}, {user}) => {
        if('????????????????????'===user.role) {
            division = await DivisionCantSyt.findById(division).lean()
            category = await CategoryCantSyt.findById(category).lean()
            if(division){
                let setting = await SettingCantSyt.findOne().lean()
                let supplier
                if(setting.supplier==='??????????????????????????')
                    supplier = division.suppliers[0]
                else
                    supplier = category.suppliers[0]
                if(supplier) {
                    let number = randomstring.generate({length: 5, charset: 'numeric'});
                    while (await ApplicationCantSyt.findOne({number: number}).lean())
                        number = randomstring.generate({length: 5, charset: 'numeric'});
                    let amount1 = {}, amount = []
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].status !== '????????????') {
                            if (!amount1[items[i].currency])
                                amount1[items[i].currency] = 0
                            amount1[items[i].currency] += items[i].count * items[i].price
                        }
                    }
                    const keys = Object.keys(amount1)
                    for (let i = 0; i < keys.length; i++) {
                        amount.push({name: keys[i], value: amount1[keys[i]]})
                    }
                    let roles = (await RouteCantSyt.findOne({specialists: user._id}).lean())
                    if(roles) {
                        roles = roles.roles
                        let route = []
                        for (let i = 0; i < roles.length; i++) {
                            route.push({role: roles[i], confirmation: undefined, cancel: undefined, comment: ''})
                        }
                        let object = {
                            status: '??????????????????',
                            number: number,
                            division: division._id,
                            subdivision: subdivision,
                            category: category._id,
                            amount: amount,
                            specialist: user._id,
                            supplier: supplier,
                            items: items,
                            routes: route,
                            budget: budget,
                            paymentType: paymentType,
                            official: official,
                            comment: comment
                        }
                        if (note) {
                            let {stream, filename} = await note;
                            filename = await saveFile(stream, filename)
                            object.note = urlMain + filename
                        }
                        let newApplication = new ApplicationCantSyt(object);
                        newApplication = await ApplicationCantSyt.create(newApplication);
                        pubsub.publish(RELOAD_DATA, {
                            reloadData: {
                                type: 'ADD',
                                who: user._id,
                                ids: [newApplication.supplier],
                                roles: [...roles, 'admin', '????????????????'],
                                application: await ApplicationCantSyt.findById(newApplication._id)
                                    .populate('specialist')
                                    .populate('supplier')
                                    .populate({
                                        path: 'division',
                                        populate: [
                                            {
                                                path: 'suppliers'
                                            }
                                        ]
                                    })
                                    .populate('category')
                                    .lean(),
                                cashConsumable: undefined,
                                waybill: undefined,
                                expenseReport: undefined,
                                balance: undefined,
                            }
                        });
                        await sendWebPushByRolesIds({
                            title: '???????????? ??????????????????',
                            message: `???????????? ???${newApplication.number} ??????????????????`,
                            url: `${process.env.URL.trim()}/application/${newApplication._id}`,
                            roles: [roles[0], 'admin', '????????????????'],
                            _ids: []
                        })
                    }
                }
            }
            return {data: 'OK'}
        }
    },
    setApplication: async(parent, {_id, budget, note, paymentType, comment, official, supplier, items, routes}, {user}) => {
        let object = await ApplicationCantSyt.findById(_id).populate('category')
        if(['????????????????????', '??????????????????', 'admin', '????????????????', ...object.routes.map(route=>route.role)].includes(user.role)){
            if(supplier){
                object.supplier = supplier
            }
            if(note){
                let { stream, filename } = await note;
                filename = await saveFile(stream, filename)
                object.note = urlMain+filename
            }
            let amount1 = {}, amount = []
            for(let i = 0; i<items.length; i++){
                if(items[i].status!=='????????????') {
                    if (!amount1[items[i].currency])
                        amount1[items[i].currency] = 0
                    amount1[items[i].currency]+=items[i].count*items[i].price
                }
            }
            const keys = Object.keys(amount1)
            for(let i = 0; i<keys.length; i++){
                amount.push({name: keys[i], value: amount1[keys[i]]})
            }
            if(budget!==undefined)
                object.budget = budget
            if(paymentType!==undefined)
                object.paymentType = paymentType
            if(official!==undefined)
                object.official = official
            if(comment)
                object.comment = comment
            object.items = items
            object.amount = amount
            if(JSON.stringify(object.routes)===JSON.stringify(routes)){
                let index = undefined
                for (let i = 0; i < routes.length; i++) {
                    if (index===undefined&&(!routes[i].confirmation||routes[i].cancel)) {
                        index = i
                    }
                }
                await sendWebPushByRolesIds({
                    title: '???????????? ????????????????',
                    message: `???????????? ???${object.number} ????????????????`,
                    url: `${process.env.URL.trim()}/application/${object._id}`,
                    roles: ['admin', '????????????????', routes[index].role],
                    _ids: []
                })
            }
            else {
                object.routes = routes
                if (!['??????????????', '????????????????'].includes(object.status)) {
                    let status = '??????????????????'
                    for (let i = 0; i < routes.length; i++) {
                        let cancel = routes[i].cancel&&routes[i].cancel.toString()!==new Date(0).toString()
                        let confirmation = routes[i].confirmation&&routes[i].confirmation.toString()!==new Date(0).toString()
                        if (cancel) {
                            status = '????????????'
                        }
                        else if (confirmation && status !== '????????????') {
                            status = '????????????'
                        }
                        else if (!confirmation && status !== '????????????') {
                            status = '??????????????????'
                        }
                    }
                    object.status = status
                }
                if (object.status === '????????????') {

                    let term = new Date()
                    term.setDate(term.getDate() + object.category.term)
                    object.term = term

                    await sendWebPushByRolesIds({
                        title: '???????????? ??????????????',
                        message: `???????????? ???${object.number} ??????????????`,
                        url: `${process.env.URL.trim()}/application/${object._id}`,
                        roles: ['admin', '????????????????', '??????????????????????', '????????????'],
                        _ids: []
                    })
                }
                else if (object.status === '??????????????????') {
                    let index = 0
                    for (let i = 0; i < routes.length; i++) {
                        if (index===undefined&&!routes[i].confirmation) {
                            index = i
                        }
                    }
                    await sendWebPushByRolesIds({
                        title: '???????????? ????????????????',
                        message: `???????????? ???${object.number} ????????????????`,
                        url: `${process.env.URL.trim()}/application/${object._id}`,
                        roles: ['admin', '????????????????', routes[index].role],
                        _ids: []
                    })
                }
                else if (object.status === '????????????') {
                    await sendWebPushByRolesIds({
                        title: '???????????? ????????????????',
                        message: `???????????? ???${object.number} ????????????????`,
                        url: `${process.env.URL.trim()}/application/${object._id}`,
                        roles: ['admin', '????????????????'],
                        _ids: [object.specialist]
                    })
                }
            }
            await object.save();
            pubsub.publish(RELOAD_DATA, { reloadData: {
                type: 'SET',
                who: user._id,
                ids: [object.supplier, object.specialist],
                roles: [...object.routes.map(route=>route.role), 'admin', '????????????????'],
                application: await ApplicationCantSyt.findOne({
                    _id: object._id
                })
                    .populate('specialist')
                    .populate('supplier')
                    .populate({
                        path : 'division',
                        populate: [
                            {
                                path: 'suppliers'
                            }
                        ]
                    })
                    .populate('category')
                    .lean(),
                cashConsumable: undefined,
                waybill: undefined,
                expenseReport: undefined,
                balance: undefined,
            } });
        }
        return {data: 'OK'}
    },
    deleteApplication: async(parent, { _id }, {user}) => {
        if(['admin', '????????????????', '????????????????????', '??????????????????'].includes(user.role)) {
            for(let i = 0; i<_id.length; i++) {
                let application = await ApplicationCantSyt.findById(_id[i]).lean()
                pubsub.publish(RELOAD_DATA, { reloadData: {
                    type: 'DELETE',
                    who: user._id,
                    ids: [application.supplier, application.specialist],
                    roles: [...application.routes.map(route=>route.role), 'admin', '????????????????'],
                    application: {
                        _id: _id[i]
                    },
                    cashConsumable: undefined,
                    waybill: undefined,
                    expenseReport: undefined,
                    balance: undefined,
                } });
                await ApplicationCantSyt.deleteMany({_id: _id[i]})
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