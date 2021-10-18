const mongoose = require('mongoose');

const ApplicationSchema = mongoose.Schema({
    status: String,
    number: String,
    subdivision: String,
    division: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DivisionOsCantSytNew'
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryOsCantSytNew'
    },
    budget: {
        type: Boolean,
        default: true
    },
    note: [String],
    paymentType:  {
        type: String,
        default: 'наличные'
    },
    official: {
        type: Boolean,
        default: true
    },
    comment: {
        type: String,
        default: ''
    },
    dateClose: Date,
    amount: [{
        name: String,
        value: Number
    }],
    term: Date,
    specialist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    items: [{
        name: String,
        unit: String,
        price: Number,
        count: Number,
        specification: String,
        currency: String,
        comment: String,
        status: String,
        GUID: String,
    }],
    routes: [{
        role: String,
        confirmation: Date,
        cancel: Date,
        comment: String
    }],
}, {
    timestamps: true
});

ApplicationSchema.index({status: 1})
ApplicationSchema.index({number: 1})
ApplicationSchema.index({division: 1})
ApplicationSchema.index({category: 1})
ApplicationSchema.index({dateClose: 1})
ApplicationSchema.index({term: 1})
ApplicationSchema.index({specialist: 1})
ApplicationSchema.index({supplier: 1})
ApplicationSchema.index({routes: 1})
ApplicationSchema.index({createdAt: 1})

const Application = mongoose.model('ApplicationOsCantSytNew', ApplicationSchema);

module.exports = Application;