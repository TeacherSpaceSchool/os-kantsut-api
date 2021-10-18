const mongoose = require('mongoose');

const DivisionSchema = mongoose.Schema({
    name: String,
    del: String,
    head: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    suppliers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }],
    staffs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }],
}, {
    timestamps: true
});

DivisionSchema.index({name: 1})
DivisionSchema.index({del: 1})

const Division = mongoose.model('DivisionOsCantSytNew', DivisionSchema);

module.exports = Division;