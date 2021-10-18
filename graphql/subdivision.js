const Subdivision = require('../models/subdivision');
const Division = require('../models/division');
const mongoose = require('mongoose');

const type = `
  type Subdivision {
    _id: ID
    createdAt: Date
    name: String
    division: Division
  }
`;

const query = `
    subdivisions(search: String!, skip: Int, division: ID): [Subdivision]
    filterSubdivision: [Filter]
`;

const mutation = `
    addSubdivision( name: String!, division: ID!): Subdivision
    setSubdivision(_id: ID!, name: String, division: ID): Data
    deleteSubdivision(_id: [ID]!): Data
`;

const resolvers = {
    subdivisions: async(parent, {search, skip, division}, {user}) => {
        if(user.checkedPinCode) {
            let subdivisions = await Subdivision.find({
                name: {'$regex': search, '$options': 'i'},
                ...division && mongoose.Types.ObjectId.isValid(division) ? {division: division} : {},
            })
                .populate({
                    path: 'division',
                    select: 'name'
                })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
            return subdivisions
        }
    },
    filterSubdivision: async(parent, ctx, {user}) => {
        let filter = [{name: 'Все', value: ''}]
        if(user.checkedPinCode) {
            let find = (await Division.find({
                del: {$ne: 'deleted'}
            }).select('name _id').sort('name').lean())
            filter = [...filter, ...find.map(elem=>{return {name: elem.name, value: elem._id}})]
        }
        return filter
    },
};

const resolversMutation = {
    addSubdivision: async(parent, {name, division}, {user}) => {
        if(user.checkedPinCode) {
            let _object = new Subdivision({
                name: name,
                division: division
            });
            _object = await Subdivision.create(_object)
            return _object
        }
    },
    setSubdivision: async(parent, {_id, name, division}, {user}) => {
        if(user.checkedPinCode) {
            let object = await Subdivision.findById(_id)
            if (name) object.name = name
            if (division) object.division = division
            await object.save();
            return {data: 'OK'}
        }
    },
    deleteSubdivision: async(parent, { _id }, {user}) => {
        if(['admin', 'менеджер'].includes(user.role)&&user.checkedPinCode) {
            await Subdivision.deleteMany({_id: {$in: _id}})
            return {data: 'OK'}
        }
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;