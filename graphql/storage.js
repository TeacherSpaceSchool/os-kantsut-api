const Storage = require('../models/storage');
const Item = require('../models/item');
const StorageHistory = require('../models/storageHistory');

const type = `
  type Storage {
    _id: ID
    createdAt: Date
    count: Float
    item: Item
  }
  type StorageHistory {
    _id: ID
    createdAt: Date
    count: String
    item: Item
  }
`;

const query = `
    storages(search: String!, skip: Int!): [Storage]
    storageHistory(item: ID!, skip: Int!, date: String!): [StorageHistory]
`;

const resolvers = {
    storageHistory: async(parent, {item, skip, date}, {user}) => {
        if(user.checkedPinCode&&['admin', 'менеджер', 'снабженец', 'завсклада'].includes(user.role)) {
            let balances
            let dateStart;
            let dateEnd;
            if (date !== '') {
                dateStart = new Date(date)
                dateStart.setHours(3, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            balances = await StorageHistory.find({
                item,
                ...date !== '' ? {$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]} : {}
            })
                .populate({
                    path: 'item',
                    select: 'name _id'
                })
                .sort('-createdAt')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return balances
        }
    },
    storages: async(parent, {search, skip}, {user}) => {
        if(user.checkedPinCode&&['admin', 'менеджер', 'снабженец', 'завсклада'].includes(user.role)) {
            let items
            if (search.length) {
                items = await Item.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            let storages
            storages = await Storage.find({
                ...search.length ? {items: {$in: items}} : {}
            })
                .populate({
                    path: 'item',
                    select: 'name _id'
                })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return storages
        }
    }
};
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;