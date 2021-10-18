const User = require('../models/user');
const Division = require('../models/division');
const randomstring = require('randomstring');
const { saveFile, deleteFile } = require('../module/const');
const readXlsxFile = require('read-excel-file/node');
const path = require('path');
const app = require('../app');

const type = `
  type User {
    _id: ID
    createdAt: Date
    login: String
    name: String
    role: String
    addApplication: Boolean
    status: String
    del: String
    phone: String
    pinCode: String
    GUID: String
  }
`;

const query = `
    users(search: String!, filter: String!, skip: Int, all: Boolean): [User]
    usersTrash(search: String!): [User]
    user(_id: ID!): User
    heads: [User]
    suppliers: [User]
    staffs: [User]
    specialists: [User]
    filterUser: [Filter]
`;

const mutation = `
    addUser(login: String!, name: String!, addApplication: Boolean!, role: String!, password: String!, phone: String): User
    setUser(_id: ID!, login: String, name: String, addApplication: Boolean, role: String, password: String, phone: String): Data
    deleteUser(_id: [ID]!): Data
    restoreUser(_id: [ID]!): Data
    onoffUser(_id: [ID]!): Data
    unloadingUser(document: Upload!): Data
`;

const resolvers = {
    usersTrash: async(parent, {search}, {user}) => {
        let res = []
        if(user.role==='admin'&&user.checkedPinCode){
            res = await User.find({
                del: 'deleted',
                $or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {login: {'$regex': search, '$options': 'i'}},
                    {role: {'$regex': search, '$options': 'i'}},
                ]
            })
                .sort('name').lean()
        }
        return res
    },
    users: async(parent, {search, filter, skip, all}, {user}) => {
        let users = []
        if(user.checkedPinCode) {
            let divisions
            if (!['admin', 'менеджер'].includes(user.role)) {
                divisions = await Division.find({
                    del: {$ne: 'deleted'},
                    $or: [{head: user._id}, {suppliers: user._id}, {specialists: user._id}, {staffs: user._id}]
                })
                    .select('head suppliers specialists staffs')
                    .lean()
                for (let i = 0; i < divisions.length; i++) {
                    users = [
                        ...users,
                        ...divisions[i].head ? [divisions[i].head] : [],
                        ...divisions[i].suppliers ? divisions[i].suppliers : [],
                        ...divisions[i].specialists ? divisions[i].specialists : [],
                        ...divisions[i].staffs ? divisions[i].staffs : []]
                }
            }
            users = await User.find({
                del: {$ne: 'deleted'},
                $and: [
                    {role: {$ne: 'admin'}},
                    {role: {'$regex': filter, '$options': 'i'}}
                ],
                $or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {login: {'$regex': search, '$options': 'i'}},
                ],
                ...!['admin', 'менеджер'].includes(user.role)&&!all?{_id: {$in: users}}:{}
            })
                .sort('name')
                .skip(skip != undefined ? skip : 0)
                .limit(skip != undefined ? 15 : 10000000000)
                .lean()
        }
        return users
    },
    specialists: async(parent, ctx, {user}) => {
        let res = []
        if(user.checkedPinCode) {
            res = await User.find({
                del: {$ne: 'deleted'},
                addApplication: true
            })
                .sort('name')
                .lean()
        }
        return res
    },
    staffs: async(parent, ctx, {user}) => {
        let res = []
        if(user.checkedPinCode) {
            res = await User.find({
                del: {$ne: 'deleted'},
                $and: [{role: {$ne: 'снабженец'}}, {role: {$ne: 'начальник отдела'}}, {role: {$ne: 'admin'}}]
            })
                .sort('name')
                .lean()
        }
        return res
    },
    suppliers: async(parent, ctx, {user}) => {
        let res = []
        if(user.checkedPinCode) {
            res = await User.find({
                del: {$ne: 'deleted'},
                role: 'снабженец'
            })
                .sort('name')
                .lean()
        }
        return res
    },
    heads: async(parent, ctx, {user}) => {
        let res = []
        if(user.checkedPinCode) {
            res = await User.find({
                del: {$ne: 'deleted'},
                role: 'начальник отдела'
            })
                .sort('name')
                .lean()
        }
        return res
    },
    user: async(parent, {_id}, {user}) => {
        if(user.checkedPinCode) {
            return await User.findOne({
                    _id: _id
            }).lean()
        }
    },
    filterUser: async(parent, ctx, {user}) => {
        if(user.checkedPinCode) {
            let filters = [
                {
                    name: 'Все',
                    value: ''
                }
            ]
            let roles = await User.find({role: {$ne: 'admin'}}).distinct('role').lean()
            for (let i = 0; i < roles.length; i++) {
                filters.push({
                    name: roles[i],
                    value: roles[i]
                })
            }
            filters.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0)
            return await filters
        }
    },
};

const resolversMutation = {
    addUser: async(parent, {login, name, role, password, phone, addApplication}, {user}) => {
        if(['admin'].includes(user.role)&&user.checkedPinCode) {
            let newUser = new User({
                login: login.trim(),
                role: role,
                status: 'active',
                password: password,
                name: name,
                phone: phone,
                addApplication,
                pinCode: randomstring.generate({
                    length: 4,
                    charset: 'numeric'
                })
            });
            newUser = await User.create(newUser);
            return newUser
        }
    },
    setUser: async(parent, {_id, login, name, role, password, phone, addApplication}, {user}) => {
        if('admin'===user.role&&user.checkedPinCode) {
            let object = await User.findById(_id)
            if(name) object.name = name
            if(password)object.password = password
            if(role)object.role = role
            if(login)object.login = login.trim()
            if(phone)object.phone = phone
            if(addApplication!==undefined)object.addApplication = addApplication
            await object.save();
        }
        return {data: 'OK'}
    },
    deleteUser: async(parent, { _id }, {user}) => {
        if(user.role==='admin'&&user.checkedPinCode) {
            let users = await User.find({_id: {$in: _id}})
            for(let i = 0; i<users.length; i++) {
                users[i].del = 'deleted'
                users[i].login = `${users[i]._id}deleted`
                await users[i].save()
            }
        }
        return {data: 'OK'}
    },
    restoreUser: async(parent, { _id }, {user}) => {
        if(user.role==='admin'&&user.checkedPinCode) {
            await User.updateMany({_id: {$in: _id}}, {del: null})
        }
        return {data: 'OK'}
    },
    onoffUser: async(parent, { _id }, {user}) => {
        if('admin'===user.role&&user.checkedPinCode) {
            let objects = await User.find({_id: {$in: _id}})
            for(let i=0; i<objects.length; i++){
                objects[i].status = objects[i].status==='active'?'deactive':'active'
                await objects[i].save()
            }
        }
        return {data: 'OK'}
    },
    unloadingUser: async(parent, { document }, {user}) => {
        if(user.role==='admin'&&user.checkedPinCode){
            let {stream, filename} = await document;
            filename = await saveFile(stream, filename);
            let xlsxpath = path.join(app.dirname, 'public', filename);
            let rows = await readXlsxFile(xlsxpath)
            let _object
            for(let i = 0;i<rows.length;i++){
                _object = await User.findOne({GUID: rows[i][1]})
                if (!_object) {
                    _object = new User({
                        login: randomstring.generate(10),
                        role: 'снабженец',
                        status: 'active',
                        password: '12345678',
                        name: rows[i][0],
                        GUID: rows[i][1],
                        phone: '',
                        pinCode: randomstring.generate({
                            length: 4,
                            charset: 'numeric'
                        })
                    });
                    _object = await User.create(_object)
                }
                else {
                    _object.name = rows[i][0]
                    await _object.save();
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