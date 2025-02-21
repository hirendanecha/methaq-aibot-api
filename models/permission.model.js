const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const permissionSchema = {
    create: {
        type: Boolean,
        default: false
    },
    read: {
        type: Boolean,
        default: false
    },
    update: {
        type: Boolean,
        default: false
    },
    delete: {
        type: Boolean,
        default: false
    }
}

const createPermissionSchema = {
    create: {
        type: Boolean,
        default: false
    },
}

const readPermissionSchema = {
    read: {
        type: Boolean,
        default: false
    },
}

const updatePermissionSchema = {
    update: {
        type: Boolean,
        default: false
    },
}

const deletePermissionSchema = {
    create: {
        type: Boolean,
        default: false
    },
}

const ModuleAcessSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },
        commonPermission: {
            department: permissionSchema,
            chatTransfer: updatePermissionSchema,
            customer: permissionSchema,
        },
    },
    {
        timestamps: true,
        __v: false
    }
);

const ModuleAcessModel = mongoose.model("module_access", ModuleAcessSchema);

module.exports = ModuleAcessModel;
