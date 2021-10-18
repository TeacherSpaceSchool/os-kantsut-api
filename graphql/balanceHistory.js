const BalanceHistory = require('../models/balanceHistory');

const type = `
  type BalanceHistory {
    _id: ID
    createdAt: Date
    removeAmount: String
    addAmount: String
    supplier: User
  }
`;

const query = `
    balanceHistory(supplier: ID!, skip: Int!, date: String!): [BalanceHistory]
`;

const resolvers = {
    balanceHistory: async(parent, {supplier, skip, date}, {user}) => {
        if(user.checkedPinCode) {
            let balances
            let dateStart;
            let dateEnd;
            if (date !== '') {
                dateStart = new Date(date)
                dateStart.setHours(3, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            if (!['admin', 'менеджер'].includes(user.role)) supplier = user._id
            balances = await BalanceHistory.find({
                supplier: supplier,
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
            return balances
        }
    },
};
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;