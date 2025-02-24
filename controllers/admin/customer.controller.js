const { default: mongoose } = require('mongoose');
const CustomerModel = require('../../models/customer.model');
const { getPagination, getPaginationData } = require('../../utils/fn');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/response');

exports.getAllCustomers = async (req, res) => {
    try {
        let { page, size, search } = req.query;
        search = search?.replace(/^[^a-zA-Z0-9]+/, "");
        const { limit, offset } = getPagination(page, size);
        const condition = search
            ? {
                name: { $regex: new RegExp(search), $options: "i" },
                email: { $regex: new RegExp(search), $options: "i" },
                phone: { $regex: new RegExp(search), $options: "i" },
                note: { $regex: new RegExp(search), $options: "i" },
            }
            : {};
        const count = await CustomerModel.countDocuments(
            condition,
        );
        const customers = await CustomerModel.find(
            condition,
            {},
        ).skip(offset).limit(limit).sort({ createdAt: -1 }).lean();
        return sendSuccessResponse(
            res,
            getPaginationData({ count, docs: customers }, page, limit),
        );
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.createCustomer = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return sendErrorResponse(res, "Please enter a customer details!", 500, true, true);
        }

        let columns = Object.keys(req.body);
        let columnNames = columns.map((val) => {
            return { [val]: req.body[val] };
        });
        const mergedObject = columnNames.reduce((result, currentObject) => {
            return { ...result, ...currentObject };
        }, {});

        const existingCustomer = await CustomerModel
            .findOne({ email: mergedObject.email });
        if (existingCustomer) {
            return sendErrorResponse(
                res,
                'Account with that email address already exists.',
                400,
                true,
                true
            );
        }
        const newCustomer = new CustomerModel(mergedObject);
        await newCustomer.save();
        sendSuccessResponse(res, { data: newCustomer, message: 'Customer created successfully' });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.getCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        // Check if customerId is valid
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return sendErrorResponse(res, 'Invalid customer ID Provided', 400);
        }
        const customer = await CustomerModel.findById(customerId).lean();
        if (!customer) {
            return sendErrorResponse(res, 'Customer not found', 404);
        }
        return sendSuccessResponse(res, customer);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.updateCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        // Check if customerId is valid
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return sendErrorResponse(res, 'Invalid customer ID', 400);
        }

        let columns = Object.keys(req.body);
        let columnNames = columns.map((val) => {
            return { [val]: req.body[val] };
        });
        const mergedObject = columnNames.reduce((result, currentObject) => {
            return { ...result, ...currentObject };
        }, {});
        const customer = await CustomerModel.findByIdAndUpdate(
            customerId,
            {
                ...mergedObject
            },
            {
                new: true
            }).lean();
        if (!customer) {
            return sendErrorResponse(res, 'Customer not found', 404);
        }
        return sendSuccessResponse(res, customer);
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.deleteCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        // Check if customerId is valid
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return sendErrorResponse(res, 'Invalid customer ID', 400);
        }
        const customer = await CustomerModel.findByIdAndDelete(customerId);
        if (!customer) {
            return sendErrorResponse(res, 'Customer not found', 404);
        }
        return sendSuccessResponse(res, 'Customer deleted successfully');
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}