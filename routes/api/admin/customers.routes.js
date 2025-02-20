const express = require("express");
const router = express.Router();
const customerCtrl = require("../../../controllers/admin/customer.controller");

/* APIs for customers
    1. Create customer
    2. Get all customers
    3. Get customer by customerId
    4. Update customer by customerId
    5. Delete customer by customerId
*/
router.get("/getallcustomers", customerCtrl.getAllCustomers);
router.get("/:customerId/getcustomerdetails", customerCtrl.getCustomer);
router.post("/createcustomer", customerCtrl.createCustomer);
router.put("/:customerId/updatecustomer", customerCtrl.updateCustomer);
router.delete("/:customerId/deletecustomer", customerCtrl.deleteCustomer);

module.exports = router;
