const mongoose = require('mongoose');

const BalanceHistorySchema = mongoose.Schema({
    removeAmount: String,
    addAmount: String,
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }
}, {
    timestamps: true
});

BalanceHistorySchema.index({supplier: 1})


const BalanceHistory = mongoose.model('BalanceHistoryOsCantSytNew', BalanceHistorySchema);

module.exports = BalanceHistory;