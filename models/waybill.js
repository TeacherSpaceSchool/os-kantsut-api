const mongoose = require('mongoose');

const WaybillSchema = mongoose.Schema({
    status: String,
    number: String,
    dateClose: Date,
    acceptSpecialist: Date,
    comment: String,
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicationOsCantSytNew'
    },
    seller: String,
    patent: [String],
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
    amount: [{
        name: String,
        value: Number
    }],
}, {
    timestamps: true
});

WaybillSchema.index({status: 1})
WaybillSchema.index({number: 1})
WaybillSchema.index({dateClose: 1})
WaybillSchema.index({createdAt: 1})
WaybillSchema.index({application: 1})
WaybillSchema.index({specialist: 1})
WaybillSchema.index({supplier: 1})

const Waybill = mongoose.model('WaybillOsCantSytNew', WaybillSchema);

module.exports = Waybill;