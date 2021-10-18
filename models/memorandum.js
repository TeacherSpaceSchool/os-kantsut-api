const mongoose = require('mongoose');

const MemorandumSchema = mongoose.Schema({
    status: String,
    number: String,
    name: String,
    comment: String,
    note: [String],
    term: Date,
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    whom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    },
    notifiables: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOsCantSytNew'
    }],
    routes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserOsCantSytNew'
        },
        confirmation: Date,
        cancel: Date,
        comment: String
    }],
    dateClose: Date,
    approve: Boolean,
    completed: Boolean,
    checked: Boolean
}, {
    timestamps: true
});

MemorandumSchema.index({status: 1})
MemorandumSchema.index({who: 1})
MemorandumSchema.index({whom: 1})
MemorandumSchema.index({createdAt: 1})

const Memorandum = mongoose.model('MemorandumOsCantSytNew', MemorandumSchema);

module.exports = Memorandum;