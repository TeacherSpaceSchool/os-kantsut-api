const mongoose = require('mongoose');

const StorageHistorySchema = mongoose.Schema({
    count: String,
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemOsCantSytNew'
    }
}, {
    timestamps: true
});

StorageHistorySchema.index({item: 1})

const StorageHistory = mongoose.model('StorageHistoryOsCantSytNew', StorageHistorySchema);

module.exports = StorageHistory;