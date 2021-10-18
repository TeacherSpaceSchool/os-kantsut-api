const Role = require('../models/role');
const mongoose = require('mongoose');

const type = `
  type Role {
    _id: ID
    createdAt: Date
    name: String
  }
`;

const query = `
    role(_id: ID!): Role
    roles(search: String!, skip: Int): [Role]
`;

const mutation = `
    addRole(name: String!): Role
    setRole(_id: ID!, name: String): Data
    deleteRole(_id: [ID]!): Data
`;

const resolvers = {
    roles: async(parent, {search, skip}, {user}) => {
        if(user.checkedPinCode) {
            return await Role.find({
                name: {'$regex': search, '$options': 'i'}
            })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
        }
    },
    role: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode)
            return await Role.findOne({
                _id: _id
            }).lean()
    },
};

const resolversMutation = {
    addRole: async(parent, {name}, {user}) => {
        if(user.checkedPinCode&&['admin', 'менеджер'].includes(user.role)&&!['admin', 'завсклад', 'менеджер', 'специалист', 'бухгалтерия', 'кассир', 'снабженец', 'генеральный директор', 'финансовый директор', 'начальник отдела'].includes(name)){
            let _object = new Role({
                name: name
            });
            _object = await Role.create(_object)
            return _object
        }
    },
    setRole: async(parent, {_id,  name}, {user}) => {
        if(user.checkedPinCode&&['admin', 'менеджер'].includes(user.role)&&!['admin', 'завсклад', 'менеджер', 'специалист', 'бухгалтерия', 'кассир', 'снабженец', 'генеральный директор', 'финансовый директор', 'начальник отдела'].includes(name)){
            let object = await Role.findById(_id)
            if(name) object.name = name
            object.save();
        }
        return {data: 'OK'}
    },
    deleteRole: async(parent, { _id }, {user}) => {
        if(user.checkedPinCode&&['admin', 'менеджер'].includes(user.role)){
            await Role.deleteMany({_id: {$in: _id}})
        }
        return {data: 'OK'}
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;