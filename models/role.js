const mongoose = require('mongoose');

const RoleSchema = mongoose.Schema({
    name: String,
}, {
    timestamps: true
});

RoleSchema.index({name: 1})

const Role = mongoose.model('RoleOsCantSytNew', RoleSchema);

module.exports = Role;