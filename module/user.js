const User = require('../models/user');
let adminId = '';
const adminLogin = require('./const').adminLogin,
    adminPass = require('./const').adminPass,
    adminPin = require('./const').adminPin;


let getAdminId = () => {
    return adminId
}

let checkAdmin = async (role, status) => {
    return (role=='admin'&&status=='active')
}

module.exports.createAdmin = async () => {
    await User.deleteMany({$or:[{login: adminLogin, role: {$ne: 'admin'}}, {role: 'admin', login: adminLogin, name: {$ne: 'admin'}}, {role: 'admin', login: {$ne: adminLogin}}]});
    let findAdmin = await User.findOne({login: adminLogin});
    if(!findAdmin){
        const _user = new User({
            login: adminLogin,
            role: 'admin',
            name: 'admin',
            status: 'active',
            password: adminPass,
            pinCode: adminPin
        });
        findAdmin = await User.create(_user);
    }
    adminId = findAdmin._id.toString();
}

module.exports.getAdminId = getAdminId;
module.exports.checkAdmin = checkAdmin;
