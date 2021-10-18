const Balance1CHistory = require('../models/balance1CHistory');

const type = `
  type Balance1CHistory {
    _id: ID
    createdAt: Date
    amount: [String]
    supplier: User
  }
`;

const query = `
    balance1CHistory(supplier: ID!, skip: Int!, date: String!): [Balance1CHistory]
`;

const resolvers = {
    balance1CHistory: async(parent, {supplier, skip, date}, {user}) => {
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
            balances = await Balance1CHistory.find({
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