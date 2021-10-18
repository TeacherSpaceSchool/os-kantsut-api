const Unit = require('../models/unit');
const mongoose = require('mongoose');

const type = `
  type Unit {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    units(search: String!, skip: Int): [Unit]
    unit(_id: ID!): Unit
`;

const mutation = `
    addUnit(name: String!): Unit
    setUnit(_id: ID!, name: String): Data
    deleteUnit(_id: [ID]!): Data
`;

const resolvers = {
    units: async(parent, {search, skip}, {user}) => {
        if(user.checkedPinCode) {
            return await Unit.find({
                name: {'$regex': search, '$options': 'i'}
            })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
        }
    },
    unit: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await Unit.findOne({
                _id: _id
            }).lean()
        }
    },
};

const resolversMutation = {
    addUnit: async(parent, {name}, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&user.checkedPinCode){
            let _object = new Unit({
                name: name
            });
            _object = await Unit.create(_object)
            return _object
        }
    },
    setUnit: async(parent, {_id,  name}, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&user.checkedPinCode){
            let object = await Unit.findById(_id)
            if(name) object.name = name
            object.save();
        }
        return {data: 'OK'}
    },
    deleteUnit: async(parent, { _id }, {user}) => {
        if((['admin', 'менеджер', 'снабженец'].includes(user.role)||user.addApplication)&&user.checkedPinCode){
            await Unit.deleteMany({_id: {$in: _id}})
        }
        return {data: 'OK'}
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;