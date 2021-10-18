const mongoose = require('mongoose');

const AutoApplicationSchema = mongoose.Schema({
    roles: [String],
    division: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DivisionOsCantSytNew'
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    specialist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    items: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});


const AutoApplication = mongoose.model('AutoApplicationOsCantSytNew', AutoApplicationSchema);

module.exports = AutoApplication;