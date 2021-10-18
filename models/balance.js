const mongoose = require('mongoose');

const BalanceSchema = mongoose.Schema({
    amount: [{
        name: String,
        value: Number
    }],
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }
}, {
    timestamps: true
});

BalanceSchema.index({supplier: 1})


const Balance = mongoose.model('BalanceOsCantSytNew', BalanceSchema);

module.exports = Balance;