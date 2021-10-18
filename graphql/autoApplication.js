const AutoApplication = require('../models/autoApplication');

const type = `
  type AutoApplication {
    _id: ID
    createdAt: Date
    roles: [String]
    division: Division
    supplier: User
    specialist: User
    items: [ItemAutoApplication]
  }
  input InputItemAutoApplication {
        _id: ID
        item: ID
        type: String
        unit: String
        triggerCount: Float
        triggerDays: [String]
        count: Float
        name: String
        GUID: String
  }
  type ItemAutoApplication {
        _id: ID
        item: ID
        type: String
        unit: String
        triggerCount: Float
        triggerDays: [String]
        count: Float
        name: String
        GUID: String
  }
`;

const query = `
    autoApplications(skip: Int): [AutoApplication]
`;

const mutation = `
    setAutoApplication(_id: ID!, roles: [String]!, specialist:ID, division: ID, supplier: ID, items: [InputItemAutoApplication]!): Data
    addAutoApplication(roles: [String]!, division: ID!, specialist:ID!, supplier: ID!, items: [InputItemAutoApplication]!): AutoApplication
    deleteAutoApplication(_id: [ID]!): Data
`;

const resolvers = {
    autoApplications: async(parent, {skip}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            let res = await AutoApplication.find()
                .populate({
                    path: 'division',
                    select: 'name _id suppliers specialists',
                    populate: [
                        {
                            path: 'suppliers',
                            select: 'name _id'
                        },
                        {
                            path: 'specialists',
                            select: 'name _id'
                        }
                    ],
                })
                .populate({
                    path: 'supplier',
                    select: '_id name',
                })
                .populate({
                    path: 'specialist',
                    select: '_id name',
                })
                .skip(skip!=undefined?skip:0)
                .limit(skip!=undefined?15:10000000000)
                .lean()
            return res
        }
    }
};

const resolversMutation = {
    addAutoApplication: async(parent, {roles, division, supplier, items, specialist}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            let object = new AutoApplication({
                roles, division, supplier, items, specialist
                });
            object = await AutoApplication.create(object);
            return await AutoApplication.findOne({_id: object._id})
                .populate({
                    path: 'division',
                    select: 'name _id suppliers specialists',
                    populate: [
                        {
                            path: 'suppliers',
                            select: 'name _id'
                        },
                        {
                            path: 'specialists',
                            select: 'name _id'
                        }
                    ],
                })
                .populate({
                    path: 'supplier',
                    select: '_id name',
                })
                .populate({
                    path: 'specialist',
                    select: '_id name',
                })
                .lean()
        }
    },
    setAutoApplication: async(parent, {_id, roles, division, supplier, items, specialist}, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            let object = await AutoApplication.findById(_id)
            object.roles = roles;
            if(division) object.division = division
            if(supplier) object.supplier = supplier
            if(specialist) object.specialist = specialist
            object.items = items
            await object.save();
            return {data: 'OK'}
        }
    },
    deleteAutoApplication: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode){
            await AutoApplication.deleteMany({_id: {$in: _id}})
            return {data: 'OK'}
        }
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;