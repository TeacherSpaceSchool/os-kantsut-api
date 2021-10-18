const Category = require('../models/category');
const Item = require('../models/item');

const type = `
  type Category {
      _id: ID
      createdAt: Date
      name: String
      del: String
      GUID: String
 }
`;

const query = `
    categorys(search: String!, skip: Int): [Category]
    categorysTrash(search: String!): [Category]
    category(_id: ID!): Category
`;

const mutation = `
    addCategory(name: String!, GUID: String): Category
    setCategory(_id: ID!, name: String, GUID: String): Data
    deleteCategory(_id: [ID]!): Data
    restoreCategory(_id: [ID]!): Data
`;

const resolvers = {
    categorysTrash: async(parent, {search}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            let categorys =  await Category.find({
                del: 'deleted',
                name: {'$regex': search, '$options': 'i'}
            })
                .sort('name')
                .lean()
            return categorys
        }
    },
    categorys: async(parent, {search, skip}, {user}) => {
        if(user.checkedPinCode) {
            let res = await Category.find({
                $and: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {name: {$ne: 'Прочие'}},
                    {name: {$ne: 'Автозакуп'}},
                ],
                del: {$ne: 'deleted'},
            })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return res
        }
    },
    category: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await Category.findOne({
                _id: _id
            })
                .lean()
        }
    },
};

const resolversMutation = {
    addCategory: async(parent, {name, GUID}, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&name!=='Прочие'&&user.checkedPinCode){
            let _object = new Category({
                name: name,
                GUID: GUID
            });
            _object = await Category.create(_object)
            return _object;
        }
    },
    setCategory: async(parent, {_id, name, GUID}, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&name!=='Прочие'&&user.checkedPinCode) {
            let object = await Category.findById(_id)
            if(name) object.name = name
            if(GUID) object.GUID = GUID
            object.save();
        }
        return {data: 'OK'}
    },
    deleteCategory: async(parent, { _id }, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&user.checkedPinCode){
            await Category.updateMany({_id: {$in: _id}, name: {$ne: 'Прочие'}}, {del: 'deleted'})
            let category = await Category.findOne({name: 'Прочие'}).lean()
            await Item.updateMany({category: {$in: _id}}, {category: category})
        }
        return {data: 'OK'}
    },
    restoreCategory: async(parent, { _id }, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&user.checkedPinCode){
            await Category.updateMany({_id: {$in: _id}}, {del: null})
        }
        return {data: 'OK'}
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;