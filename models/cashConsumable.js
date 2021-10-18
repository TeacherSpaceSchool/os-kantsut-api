const mongoose = require('mongoose');

const CashConsumableSchema = mongoose.Schema({
    GUID: String,
    number: String,
    currencyType: String,
    dateClose: Date,
    amount: Number,
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    comment: {
        type: String,
        default: ''
    },
    budget: {
        type: String,
        default: ''
    },
}, {
    timestamps: true
});

CashConsumableSchema.index({number: 1})
CashConsumableSchema.index({dateClose: 1})
CashConsumableSchema.index({createdAt: 1})
CashConsumableSchema.index({amount: 1})
CashConsumableSchema.index({supplier: 1})
CashConsumableSchema.index({status: 1})

const CashConsumable = mongoose.model('CashConsumableOsCantSytNew', CashConsumableSchema);

module.exports = CashConsumable;