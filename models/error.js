const mongoose = require('mongoose');

const ErrorSchema = mongoose.Schema({
    err: String,
    path: String,
}, {
    timestamps: true
});

const Error = mongoose.model('ErrorOsCantSytNew', ErrorSchema);

module.exports = Error;