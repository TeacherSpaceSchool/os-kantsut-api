const mongoose = require('mongoose');

const CashExchangeSchema = mongoose.Schema({
    GUID: String,
    number: String,
    exchangeFrom: Number,
    sync: Number,
    currencyTypeFrom: String,
    exchangeTo: Number,
    currencyTypeTo: String,
    currencyTypeRate: String,
    exchangeRate: Number,
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    comment: {
        type: String,
        default: ''
    },
    note: [String]
}, {
    timestamps: true
});

CashExchangeSchema.index({number: 1})
CashExchangeSchema.index({createdAt: 1})
CashExchangeSchema.index({supplier: 1})

const CashExchange = mongoose.model('CashExchangeOsCantSytNew', CashExchangeSchema);

module.exports = CashExchange;