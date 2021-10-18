const Item = require('../models/item');
const Category = require('../models/category');
const mongoose = require('mongoose');
const { saveFile, deleteFile } = require('../module/const');
const readXlsxFile = require('read-excel-file/node');
const path = require('path');
const app = require('../app');
const uuidv1 = require('uuid/v1.js');

const type = `
  type Item {
      _id: ID
      createdAt: Date
      name: String
      category: Category
      GUID: String
      lastPrice: [Currency]
 }
`;

const query = `
    items(category: ID, search: String!, skip: Int): [Item]
    item(_id: ID!): Item
    filterItem: [Filter]
`;

const mutation = `
    addItem( name: String!, category: ID!): Item
    setItem(_id: ID!, name: String, category: ID): Data
    deleteItem(_id: [ID]!): Data
    unloadingItem(document: Upload!): Data
`;

const resolvers = {
    items: async(parent, {category, search, skip}, {user}) => {
        if(user.checkedPinCode) {
            let items = await Item.find({
                ...category && mongoose.Types.ObjectId.isValid(category) ? {category: category} : {},
                $or: [
                    {name: {'$regex': search, '$options': 'i'}}
                ]
            })
                .populate({
                    path: 'category',
                    select: 'name _id'
                })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return items
        }
    },
    item: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await Item.findOne({
                _id: _id,
            })
                .populate({
                    path: 'category',
                    select: 'name _id'
                })
                .lean()
        }
    },
    filterItem: async(parent, ctx, {user}) => {
        if(user.checkedPinCode) {
            let categorys = await Category.find({
                del: {$ne: 'deleted'}
            }).select('name _id').sort('name').lean()
            let filter = [
                {
                    name: 'Все',
                    value: ''
                }
            ]
            for (let i = 0; i < categorys.length; i++) {
                filter = [
                    ...filter,
                    {
                        name: categorys[i].name,
                        value: categorys[i]._id
                    }
                ]
            }
            return filter
        }
    },
};

const resolversMutation = {
    addItem: async(parent, {name, category, }, {user}) => {
        if(user.checkedPinCode) {
            let _object = new Item({
                name: name,
                category: category,
                GUID: await uuidv1(),
                lastPrice: []
            });
            _object = await Item.create(_object)
            return _object
        }
    },
    setItem: async(parent, {_id, name, category}, {user}) => {
        if(user.checkedPinCode) {
            let object = await Item.findById(_id)
            if (name) object.name = name
            if (category) object.category = category
            object.sync = undefined
            await object.save();
            return {data: 'OK'}
        }
    },
    deleteItem: async(parent, { _id }, {user}) => {
        if(user.checkedPinCode) {
            await Item.deleteMany({_id: {$in: _id}})
            return {data: 'OK'}
        }
    },
    unloadingItem: async(parent, { document }, {user}) => {
        if(user.role==='admin'&&user.checkedPinCode){
            let {stream, filename} = await document;
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let rows = await readXlsxFile(xlsxpath)
            let item
            for(let i = 0;i<rows.length;i++){
                let category = await Category.findOne({GUID: rows[i][3]}).select('_id').lean()
                if (!category) {
                    category = new Category({
                        name: rows[i][2],
                        suppliers: [],
                        GUID: rows[i][3]
                    });
                    category = await Category.create(category)
                }
                item = await Item.findOne({GUID: rows[i][1]}).populate('category')
                if (!item) {
                    item = new Item({
                        name: rows[i][0],
                        category: category._id,
                        GUID: rows[i][1],
                        lastPrice: []
                    });
                    await Item.create(item)
                }
                else {
                    item.name = rows[i][0]
                    if(item.category.GUID!==rows[i][3]){
                        item.category = category._id
                    }
                    await item.save();
                }
            }
            await deleteFile(filename)
            return({data: 'OK'})
        }
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;