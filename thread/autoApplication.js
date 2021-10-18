const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const AutoApplication = require('../models/autoApplication');
const Application = require('../models/application');
const Storage = require('../models/storage');
const Category = require('../models/category');
const {checkFloat, weekDay} = require('../module/const');
const { pubsub } = require('../graphql/index');
const { sendWebPushByRolesIds } = require('../module/webPush');
const RELOAD_DATA = 'RELOAD_DATA';
const randomstring = require('randomstring');

connectDB.connect();
if(!isMainThread) {
    cron.schedule('1 6 * * *', async() => {
        let autoApplication = await AutoApplication.find({}).lean()
        let category = await Category.findOne({name: 'Автозакуп'}).select('_id').lean()
        let items, storage, buy
        for(let i=0; i<autoApplication.length; i++) {
            if(autoApplication[i].supplier&&autoApplication[i].division) {
                items = []
                for (let i1 = 0; i1 < autoApplication[i].items.length; i1++) {
                    buy = false
                    if(autoApplication[i].items[i1].type==='Количество') {
                        storage = await Storage.findOne({item: autoApplication[i].items[i1].item}).select('count').lean()
                        buy = storage&&storage.count<=autoApplication[i].items[i1].triggerCount
                    } else {
                        buy = autoApplication[i].items[i1].triggerDays.includes(weekDay[(new Date()).getDay()])
                    }
                    if (buy&&autoApplication[i].items[i1].item) {
                        items.push({
                            name: autoApplication[i].items[i1].name,
                            unit: autoApplication[i].items[i1].unit,
                            currency: 'сом',
                            price: 0,
                            count: autoApplication[i].items[i1].count,
                            comment: '',
                            GUID: autoApplication[i].items[i1].GUID,
                            status: 'принят'
                        })
                    }
                }
                let number = randomstring.generate({length: 6, charset: 'numeric'});
                while (await Application.findOne({number: number}).select('_id').lean())
                    number = randomstring.generate({length: 6, charset: 'numeric'});
                let amount1 = {}, amount = []
                for (let i1 = 0; i1 < items.length; i1++) {
                    if (items[i1].status !== 'отмена') {
                        if (!amount1[items[i1].currency])
                            amount1[items[i1].currency] = 0
                        amount1[items[i1].currency] += items[i1].count * items[i1].price
                    }
                }
                const keys = Object.keys(amount1)
                for (let i1 = 0; i1 < keys.length; i1++) {
                    amount.push({name: keys[i1], value: checkFloat(amount1[keys[i1]])})
                }
                let routes = []
                for (let i1 = 0; i1 < autoApplication[i].roles.length; i1++) {
                    routes.push({
                        role: autoApplication[i].roles[i1],
                        confirmation: undefined,
                        cancel: undefined,
                        comment: ''
                    })
                }
                let term = new Date()
                term.setDate(term.getDate() + 1)
                let object = {
                    status: 'обработка',
                    number,
                    division: autoApplication[i].division,
                    category: category._id,
                    amount,
                    specialist: autoApplication[i].specialist,
                    supplier: autoApplication[i].supplier,
                    items,
                    routes,
                    budget: true,
                    paymentType: 'наличные',
                    official: true,
                    comment: 'Aвтозакуп',
                    term
                }
                let newApplication = new Application(object);
                newApplication = await Application.create(newApplication);
                pubsub.publish(RELOAD_DATA, {
                    reloadData: {
                        type: 'ADD',
                        who: undefined,
                        ids: [newApplication.supplier],
                        roles: [...autoApplication[i].roles, 'admin', 'менеджер'],
                        application: await Application.findById(newApplication._id)
                            .select('term _id number status createdAt dateClose category division supplier specialist amount routes')
                            .populate({
                                path: 'specialist',
                                select: 'name _id'
                            })
                            .populate({
                                path: 'supplier',
                                select: 'name _id'
                            })
                            .populate({
                                path: 'division',
                                select: 'name _id'
                            })
                            .populate({
                                path: 'category',
                                select: 'name _id'
                            })
                            .lean(),
                        cashConsumable: undefined,
                        waybill: undefined,
                        expenseReport: undefined,
                        balance: undefined,
                    }
                });
                await sendWebPushByRolesIds({
                    title: 'Заявка добавлена',
                    message: `Заявка №${newApplication.number} добавлена`,
                    url: `${process.env.URL.trim()}/application/${newApplication._id}`,
                    roles: [...autoApplication[i].roles, 'admin', 'менеджер'],
                    _ids: []
                })
            }
        }
    });
}