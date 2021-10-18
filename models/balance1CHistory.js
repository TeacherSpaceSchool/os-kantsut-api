const mongoose = require('mongoose');

const Balance1CHistrySchema = mongoose.Schema({
    amount: [String],
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }
}, {
    timestamps: true
});

Balance1CHistrySchema.index({supplier: 1})


const Balance1CHistry = mongoose.model('Balance1CHistryOsCantSytNew', Balance1CHistrySchema);

module.exports = Balance1CHistry;