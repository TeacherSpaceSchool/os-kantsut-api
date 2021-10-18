const { signupuserGQL, signinuserGQL } = require('../module/passport');

const type = `
  type Status {
    role: String
    status: String
    login: String
    addApplication: Boolean
    _id: ID
  }
`;

const query = `
    getStatus: Status
    sendPinCode(pinCode: String): Boolean
`;

const resolvers = {
    getStatus: async(parent, args, {user}) => {
        return user
    },
    sendPinCode: async(parent, {pinCode}, {user, res}) => {
        let check = user.pinCode === pinCode
        if(check)
            await res.cookie('pinCode', pinCode);
        return check
    },
};

const mutation = `
    signupuser(login: String, password: String): Status
    signinuser(login: String!, password: String!): Status
`;

const resolversMutation = {
    signupuser: async(parent, { login, password}, {res}) => {
        return await signupuserGQL({ login: login, password: password }, res);
    },
    signinuser: async(parent, { login, password}, {req, res}) => {
        return await signinuserGQL({ ...req, query: {login: login, password: password}}, res);
    },
};

module.exports.resolvers = resolvers;
module.exports.query = query;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;