const mongoose = require('mongoose');

const UnitSchema = mongoose.Schema({
    name: String
}, {
    timestamps: true
});

UnitSchema.index({name: 1})

const Unit = mongoose.model('UnitOsCantSytNew', UnitSchema);

module.exports = Unit;