const mongoose = require('mongoose');

const ExpenseReportSchema = mongoose.Schema({
    status: String,
    number: String,
    GUID: String,
    dateClose: Date,
    acceptHead: Date,
    sync: {
        type: Number,
        default: 0
    },
    applications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicationOsCantSytNew'
    }],
    cashExchanges: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashExchangeOsCantSytNew'
    }],
    waybills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WaybillOsCantSytNew'
    }],
    cashConsumables: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CashConsumableOsCantSytNew'
    }],
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    balanceStart: [{
        name: String,
        value: Number
    }],
    receivedAmount: [{
        name: String,
        value: Number
    }],
    expense: [{
        name: String,
        value: Number
    }],
    overExpense: [{
        name: String,
        value: Number
    }],
    outCashbox: [{
        name: String,
        value: Number
    }],
    balanceEnd: [{
        name: String,
        value: Number
    }],
    addedItems: [{
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
}, {
    timestamps: true
});

ExpenseReportSchema.index({status: 1})
ExpenseReportSchema.index({number: 1})
ExpenseReportSchema.index({createdAt: 1})
ExpenseReportSchema.index({application: 1})
ExpenseReportSchema.index({dateClose: 1})
ExpenseReportSchema.index({supplier: 1})

const ExpenseReport = mongoose.model('ExpenseReportOsCantSytNew', ExpenseReportSchema);

module.exports = ExpenseReport;