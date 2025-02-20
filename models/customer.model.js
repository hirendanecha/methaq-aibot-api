const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    notes: [{ type: String }],
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
}, {
    timestamps: true,
});

CustomerSchema.index({
    name: "text",
    email: "text",
    phone: "text",
    notes: "text",
});

const CustomerModel = mongoose.model('customers', CustomerSchema);
module.exports = CustomerModel;
