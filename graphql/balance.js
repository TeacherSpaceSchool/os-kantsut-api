const Balance = require('../models/balance');
const User = require('../models/user');
const Balance1C = require('../models/balance1C');
const BalanceHistory = require('../models/balanceHistory');

const type = `
  type Balance {
    _id: ID
    createdAt: Date
    amount: [Currency]
    supplier: User
    error: Boolean
  }
`;

const query = `
    balances(search: String!, skip: Int!): [Balance]
    myBalance: Balance
    balances1C(search: String!, skip: Int!): [Balance]
    myBalance1C: Balance
`;

const resolvers = {
    myBalance: async(parent, ctx, {user}) => {
        if('снабженец'===user.role&&user.checkedPinCode){
            return await Balance.findOne({
                supplier: user._id
            })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .lean()
        }
    },
    myBalance1C: async(parent, ctx, {user}) => {
        if('снабженец'===user.role&&user.checkedPinCode){
            return await Balance1C.findOne({
                supplier: user._id
            })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .lean()
        }
    },
    balances1C: async(parent, {search, skip}, {user}) => {
        if(['admin', 'менеджер', 'снабженец'].includes(user.role)&&user.checkedPinCode) {
            let users
            if (search.length) {
                users = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            let balances, balance, balanceAmount
            balances = await Balance1C.find({
                ...'снабженец'===user.role?{supplier: user._id}:{},
                ...search.length ? {supplier: {$in: users}} : {}
            })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            for(let i = 0; i<balances.length; i++) {
                balance = await Balance.findOne({
                    supplier: balances[i].supplier._id
                }).select('amount').lean()
                if(balance) {
                    balanceAmount = {}
                    for (let i1 = 0; i1 < balance.amount.length; i1++) {
                        balanceAmount[balance.amount[i1].name] = balance.amount[i1].value
                    }
                    for (let i1 = 0; i1 < balances[i].amount.length; i1++) {
                        balances[i].error = balanceAmount[balances[i].amount[i1].name] !== balances[i].amount[i1].value
                    }
                }
            }
            return balances
        }
    },
    balances: async(parent, {search, skip}, {user}) => {
        if(user.checkedPinCode) {
            let users
            if (search.length) {
                users = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            let balances, balance1C, balance1CAmount
            balances = await Balance.find({
                ...'снабженец'===user.role?{supplier: user._id}:{},
                ...search.length ? {supplier: {$in: users}} : {}
            })
                .populate({
                    path: 'supplier',
                    select: 'name _id'
                })
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            for(let i = 0; i<balances.length; i++) {
                balance1C = await Balance1C.findOne({
                    supplier: balances[i].supplier._id
                }).select('amount').lean()
                if(balance1C) {
                    balance1CAmount = {}
                    for (let i1 = 0; i1 < balance1C.amount.length; i1++) {
                        balance1CAmount[balance1C.amount[i1].name] = balance1C.amount[i1].value
                    }
                    for (let i1 = 0; i1 < balances[i].amount.length; i1++) {
                        balances[i].error = balance1CAmount[balances[i].amount[i1].name] !== balances[i].amount[i1].value
                    }
                }
            }
            return balances
        }
    }
};
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;
module.exports.changeBalance = async({supplier, currencyType, addAmount, removeAmount})=>{
    let balance = await Balance.findOne({supplier: supplier})
    let index
    if(!balance) {
        balance = new Balance({
            amount: [],
            supplier: supplier
        });
        balance = await Balance.create(balance);
    }
    for(let i=0; i<balance.amount.length; i++){
        if(balance.amount[i].name===currencyType)
            index = i
    }
    if(index==undefined){
        balance.amount.push({name: currencyType, value: 0})
        index = balance.amount.length-1
    }
    let startValue = balance.amount[index].value
    balance.amount[index].value -= removeAmount
    balance.amount[index].value += addAmount
    await balance.save()
    let balanceHistory = new BalanceHistory({
        supplier: supplier
    });
    if(removeAmount)
        balanceHistory.removeAmount = `${startValue} - ${removeAmount} = ${balance.amount[index].value} ${currencyType}`
    if(addAmount)
        balanceHistory.addAmount = `${startValue} + ${addAmount} = ${balance.amount[index].value} ${currencyType}`
    await BalanceHistory.create(balanceHistory);
}