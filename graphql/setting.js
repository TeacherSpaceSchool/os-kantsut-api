const Setting = require('../models/setting');
const Application = require('../models/application');
const Balance = require('../models/balance');
const Balance1C = require('../models/balance1C');
const BalanceHistory = require('../models/balanceHistory');
const Balance1CHistory = require('../models/balance1CHistory');
const CashConsumable = require('../models/cashConsumable');
const Category = require('../models/category');
const Division = require('../models/division');
const ExpenseReport = require('../models/expenseReport');
const Faq = require('../models/faq');
const ItemReport = require('../models/item');
const Role = require('../models/role');
const Route = require('../models/route');
const Seller = require('../models/seller');
const Subdivision = require('../models/subdivision');
const Subscriber = require('../models/subscriber');
const Unit = require('../models/unit');
const User = require('../models/user');
const Waybill = require('../models/waybill');
const Memorandum = require('../models/memorandum');
const AutoApplication = require('../models/autoApplication');
const CashExchange = require('../models/cashExchange');
const Storage = require('../models/storage');
const StorageHistory = require('../models/storageHistory');

const type = `
  type Setting {
    _id: ID
    createdAt: Date
    lang: String
  }
`;

const query = `
    setting: Setting
`;

const mutation = `
    setSetting(lang: String): Data
    clearStorage: Data
`;

const resolvers = {
    setting: async(parent, ctx, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            return await Setting.findOne().lean()
        }
    }
};

const resolversMutation = {
    setSetting: async(parent, {lang}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            let object = await Setting.findOne()
            if (lang) object.lang = lang
            await object.save();
        }
        return {data: 'OK'}
    },
    clearStorage: async(parent, ctx, {user}) => {
        if('admin'===user.role&&user.checkedPinCode) {
            await Application.deleteMany();
            await Balance.deleteMany();
            await Balance1C.deleteMany();
            await BalanceHistory.deleteMany();
            await Balance1CHistory.deleteMany();
            await CashConsumable.deleteMany();
            await Category.deleteMany();
            await Division.deleteMany();
            await ExpenseReport.deleteMany();
            await Faq.deleteMany();
            await ItemReport.deleteMany();
            await Role.deleteMany();
            await Route.deleteMany();
            await Seller.deleteMany();
            await Subdivision.deleteMany();
            await Subscriber.deleteMany();
            await Unit.deleteMany();
            await User.deleteMany({role: {$ne: 'admin'}});
            await Waybill.deleteMany();
            await Memorandum.deleteMany();
            await AutoApplication.deleteMany();
            await Storage.deleteMany();
            await StorageHistory.deleteMany();
            await CashExchange.deleteMany();
        }
        return {data: 'OK'}
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;