const mongoose = require('mongoose');

const Balance1CSchema = mongoose.Schema({
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

Balance1CSchema.index({supplier: 1})


const Balance1C = mongoose.model('Balance1COsCantSytNew', Balance1CSchema);

module.exports = Balance1C;