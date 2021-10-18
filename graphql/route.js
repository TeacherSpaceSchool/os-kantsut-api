const Route = require('../models/route');
const User = require('../models/user');

const type = `
  type Route {
    _id: ID
    createdAt: Date
    roles: [String]
    specialists: [User]
  }
`;

const query = `
    routes(search: String!, skip: Int): [Route]
    specialistsForRoute: [User]
    
`;

const mutation = `
    setRoute(_id: ID!, roles: [String]!, specialists: [ID]): Data
    addRoute(roles: [String]!, specialists: [ID]!): Route
    deleteRoute(_id: [ID]!): Data
`;

const resolvers = {
    specialistsForRoute: async(parent, ctx, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            let specialists = await Route.find()
                .distinct('specialists')
                .lean()
            return await User.find({addApplication: true, _id: {$nin: specialists}})
                .sort('name')
                .lean()
        }
    },
    routes: async(parent, {search, skip}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            let specialists
            if(search.length){
                specialists = await User.find({name: {'$regex': search, '$options': 'i'}}).distinct('_id').lean()
            }
            return await Route.find({
                ...search.length?{specialists: {$in: specialists}}:{}
            })
                .populate({
                    path: 'specialists',
                    select: '_id name',
                })
                .skip(skip!=undefined?skip:0)
                .limit(skip!=undefined?15:10000000000)
                .lean()
        }
    },
};

const resolversMutation = {
    addRoute: async(parent, {roles, specialists}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            let object = new Route({
                roles,
                specialists
            });
            object = await Route.create(object);
            return object
        }
    },
    setRoute: async(parent, {_id, roles, specialists}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            let object = await Route.findById(_id)
            object.roles = roles;
            if(specialists) object.specialists = specialists
            await object.save();
            return {data: 'OK'}
        }
    },
    deleteRoute: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            await Route.deleteMany({_id: {$in: _id}})
            return {data: 'OK'}
        }
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;