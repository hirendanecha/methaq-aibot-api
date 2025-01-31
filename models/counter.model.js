const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
    _id: {
        type: String,
    },
    seq: {
        type: Number,
        default: 0,
    },
});

const CounterModel = mongoose.model("counter", CounterSchema);

module.exports = CounterModel;
