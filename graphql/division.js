const Division = require('../models/division');
const Subdivision = require('../models/subdivision');
const Route = require('../models/route');

const type = `
  type Division {
    _id: ID
    createdAt: Date
    name: String
    del: String
    head: User
    suppliers: [User]
    staffs: [User]
  }
`;

const query = `
    divisions(search: String!, skip: Int): [Division]
    divisionsForRoute: [Division]
    divisionsTrash(search: String!): [Division]
    division(_id: ID!): Division
`;

const mutation = `
    addDivision( name: String!, suppliers: [ID]!, head: ID, staffs: [ID]!): Division
    setDivision(_id: ID!, name: String, suppliers: [ID], head: ID, staffs: [ID]): Data
    deleteDivision(_id: [ID]!): Data
    restoreDivision(_id: [ID]!): Data
`;

const resolvers = {
    divisionsTrash: async(parent, {search}, {user}) => {
        if('admin'===user.role&&user.checkedPinCode){
            let divisions =  await Division.find({
                del: 'deleted',
                name: {'$regex': search, '$options': 'i'}
            })
                .populate({
                    path: 'suppliers',
                    select: 'name _id'
                })
                .populate({
                    path: 'head',
                    select: 'name _id'
                })
                .populate({
                    path: 'staffs',
                    select: 'name _id'
                })
                .sort('name')
                .lean()
            return divisions
        }
    },
    divisionsForRoute: async(parent, ctx, {user}) => {
        if(user.checkedPinCode) {
            let divisions = await Route.find().distinct('division').lean()
            divisions = await Division.find({
                del: {$ne: 'deleted'},
                _id: {$nin: divisions}
            })
                .populate({
                    path: 'suppliers',
                    select: 'name _id'
                })
                .populate({
                    path: 'head',
                    select: 'name _id'
                })
                .populate({
                    path: 'staffs',
                    select: 'name _id'
                })
                .sort('name')
                .lean()
            return divisions
        }
    },
    divisions: async(parent, {search, skip}, {user}) => {
        if(user.checkedPinCode) {
            let divisions = await Division.find({
                ...user.role!=='admin' ? {$or: [{head: user._id}, {suppliers: user._id}, {staffs: user._id}]} : {},
                del: {$ne: 'deleted'},
                name: {'$regex': search, '$options': 'i'}
            })
                .populate({
                    path: 'suppliers',
                    select: 'name _id'
                })
                .populate({
                    path: 'head',
                    select: 'name _id'
                })
                .populate({
                    path: 'staffs',
                    select: 'name _id'
                })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return divisions
        }
    },
    division: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await Division.findOne({
                _id: _id,
            })
                .populate({
                    path: 'suppliers',
                    select: 'name _id'
                })
                .populate({
                    path: 'head',
                    select: 'name _id'
                })
                .populate({
                    path: 'staffs',
                    select: 'name _id'
                })
                .lean()
        }
    }
};

const resolversMutation = {
    addDivision: async(parent, {name, suppliers, head, staffs}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            let _object = new Division({
                name: name,
                suppliers: suppliers,
                head: head,
                staffs: staffs
            });
            _object = await Division.create(_object)
            return _object
        }
    },
    setDivision: async(parent, {_id, name, suppliers, head, staffs}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            let object = await Division.findById(_id)
            if(name)object.name = name
            object.suppliers = suppliers
            object.head = head
            object.staffs = staffs
            await object.save();
            return {data: 'OK'}
        }
    },
    deleteDivision: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            await Division.updateMany({_id: {$in: _id}}, {del: 'deleted', suppliers: []})
            await Subdivision.deleteMany({division: {$in: _id}})
            await Route.deleteMany({division: {$in: _id}})
            return {data: 'OK'}
        }
    },
    restoreDivision: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            await Division.updateMany({_id: {$in: _id}}, {del: null})
            return {data: 'OK'}
        }
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;