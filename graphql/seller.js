const Seller = require('../models/seller');

const type = `
  type Seller {
    _id: ID
    createdAt: Date
    name: String
    address: String
    phone: String
  }
`;

const query = `
    seller(_id: ID!): Seller
    sellers(search: String!, skip: Int): [Seller]
`;

const mutation = `
    addSeller(name: String!, address: String, phone: String): Seller
    setSeller(_id: ID!, name: String, address: String, phone: String): Data
    deleteSeller(_id: [ID]!): Data
`;

const resolvers = {
    sellers: async(parent, {search, skip}, {user}) => {
        if(user.checkedPinCode) {
            return await Seller.find({
                name: {'$regex': search, '$options': 'i'}
            })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
        }
    },
    seller: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode)
            return await Seller.findOne({
                _id: _id
            }).lean()
    },
};

const resolversMutation = {
    addSeller: async(parent, {name, address, phone}, {user}) => {
        if(user.checkedPinCode){
            let _object = new Seller({name, address, phone});
            _object = await Seller.create(_object)
            return _object
        }
    },
    setSeller: async(parent, {_id,  name, address, phone}, {user}) => {
        if(user.checkedPinCode){
            let object = await Seller.findById(_id)
            if(name) object.name = name
            if(address) object.address = address
            if(phone) object.phone = phone
            object.save();
        }
        return {data: 'OK'}
    },
    deleteSeller: async(parent, { _id }, {user}) => {
        if(user.checkedPinCode){
            await Seller.deleteMany({_id: {$in: _id}})
        }
        return {data: 'OK'}
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;