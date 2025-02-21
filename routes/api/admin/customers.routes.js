const express = require("express");
const router = express.Router();
const customerCtrl = require("../../../controllers/admin/customer.controller");
const { permissionAuthorization } = require("../../../middleware/authorization");
/* APIs for customers
    1. Create customer
    2. Get all customers
    3. Get customer by customerId
    4. Update customer by customerId
    5. Delete customer by customerId
*/
router.get("/getallcustomers", permissionAuthorization("commonPermission.customer", ["read"]), customerCtrl.getAllCustomers);
router.get("/:customerId/getcustomerdetails", permissionAuthorization("commonPermission.customer", ["read"]), customerCtrl.getCustomer);
router.post("/createcustomer", permissionAuthorization("commonPermission.customer", ["create"]), customerCtrl.createCustomer);
router.put("/:customerId/updatecustomer", permissionAuthorization("commonPermission.customer", ["update"]), customerCtrl.updateCustomer);
router.delete("/:customerId/deletecustomer", permissionAuthorization("commonPermission.customer", ["delete"]), customerCtrl.deleteCustomer);

module.exports = router;
