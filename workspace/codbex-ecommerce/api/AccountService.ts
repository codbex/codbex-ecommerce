import { Controller, Get, Put, Post, response } from "sdk/http";
import { query, sql } from 'sdk/db';
import * as utils from './UtilsService';
import { user } from 'sdk/security';
import * as types from './types/Types';

import { CustomerAddressRepository as CustomerAddressDao } from "codbex-partners/gen/codbex-partners/dao/Customers/CustomerAddressRepository";
import { CustomerRepository as CustomerDao } from "codbex-partners/gen/codbex-partners/dao/Customers/CustomerRepository";

@Controller
class AccountService {

    private readonly customerAddressDao;
    private readonly customerDao;

    constructor() {
        this.customerAddressDao = new CustomerAddressDao();
        this.customerDao = new CustomerDao();
    }

    @Get("/account/addresses")
    public addressesData(): types.AddressesResponse {

        const customer: number = utils.mapCustomer(user.getName());

        const addressQuery = sql.getDialect()
            .select()
            .column('CUSTOMERADDRESS_ID')
            .column('CUSTOMERADDRESS_FIRSTNAME')
            .column('CUSTOMERADDRESS_LASTNAME')
            .column('CUSTOMERADDRESS_EMAIL')
            .column('CUSTOMERADDRESS_PHONE')
            .column('CUSTOMERADDRESS_ADRESSLINE1')
            .column('CUSTOMERADDRESS_ADDRESSLINE2')
            .column('CUSTOMERADDRESS_COUNTRY')
            .column('CUSTOMERADDRESS_CITY')
            .column('CUSTOMERADDRESS_POSTALCODE')
            .column('CUSTOMERADDRESS_CUSTOMER')
            .column('CUSTOMERADDRESS_CUSTOMERADDRESSTYPE')
            .from('CODBEX_CUSTOMERADDRESS')
            .where('CUSTOMERADDRESS_CUSTOMER = ?')
            .build();

        const allAddresses = query.execute(addressQuery, [customer]).map(row => {
            const country = utils.mapCountry(row.CUSTOMERADDRESS_COUNTRY);
            const city = utils.mapCity(row.CUSTOMERADDRESS_CITY);

            return {
                id: row.CUSTOMERADDRESS_ID,
                firstName: row.CUSTOMERADDRESS_FIRSTNAME,
                lastName: row.CUSTOMERADDRESS_LASTNAME,
                country,
                addressLine1: row.CUSTOMERADDRESS_ADDRESSLINE1,
                addressLine2: row.CUSTOMERADDRESS_ADDRESSLINE2,
                city,
                postalCode: row.CUSTOMERADDRESS_POSTALCODE,
                phoneNumber: row.CUSTOMERADDRESS_PHONE,
                email: row.CUSTOMERADDRESS_EMAIL,
                addressType: row.CUSTOMERADDRESS_CUSTOMERADDRESSTYPE
            };
        });

        const shippingAddress: types.Address[] = allAddresses
            .filter(a => a.addressType === 1)
            .map(({ addressType, ...rest }) => rest);

        const billingAddress: types.Address[] = allAddresses
            .filter(a => a.addressType === 2)
            .map(({ addressType, ...rest }) => rest);

        return {
            shippingAddress,
            billingAddress
        };
    }

    @Get("/account/details")
    public accountData(): types.AccountDetails {

        const customerId = utils.mapCustomer(user.getName());

        const customerQuery = sql.getDialect()
            .select()
            .column('CUSTOMER_FIRSTNAME')
            .column('CUSTOMER_LASTNAME')
            .column('CUSTOMER_EMAIL')
            .column('CUSTOMER_PHONE')
            .column('CUSTOMER_CREATEDAT')
            .from('CODBEX_CUSTOMER')
            .where('CUSTOMER_ID = ?')
            .build();

        const customerResult = query.execute(customerQuery, [customerId]);

        const customer = customerResult[0];

        return {
            firstName: customer.CUSTOMER_FIRSTNAME,
            lastName: customer.CUSTOMER_LASTNAME,
            phoneNumber: customer.CUSTOMER_PHONE,
            email: customer.CUSTOMER_EMAIL,
            creationDate: customer.CUSTOMER_CREATEDAT
        };
    }

    @Get("/account/orders")
    public ordersData(): types.SalesOrder[] {

        const customerId = utils.mapCustomer(user.getName());

        const salesOrderQuery = sql.getDialect()
            .select()
            .column('SALESORDER_ID')
            .column('SALESORDER_DATE')
            .column('SALESORDER_STATUS')
            .column('SALESORDER_CURRENCY')
            .column('SALESORDER_TOTAL')
            .from('CODBEX_SALESORDER')
            .where('SALESORDER_CUSTOMER = ?')
            .build();

        const salesOrderResults = query.execute(salesOrderQuery, [customerId]);

        const salesOrders: types.SalesOrder[] = salesOrderResults.map(row => {
            const currencyCode = utils.mapCurrencyCode(row.SALESORDER_CURRENCY);
            const status = utils.mapStatus(row.SALESORDER_STATUS);

            return {
                id: String(row.SALESORDER_ID),
                creationDate: new Date(row.SALESORDER_DATE).toISOString(),
                status,
                totalAmount: {
                    amount: row.SALESORDER_TOTAL,
                    currency: currencyCode
                }
            };
        });

        return salesOrders;
    }

    @Put("/account/address/:id")
    public updateAddress(body: types.UpdateAddress, ctx: any) {
        const addressId = ctx.pathParameters.id;
        const userIdentifier = user.getName();

        const customerFromAddress = utils.getCustomerFromAddress(addressId);
        const loggedCustomer = utils.mapCustomer(userIdentifier);

        if (customerFromAddress !== loggedCustomer) {
            ctx.status = 403;
            return { error: "Forbidden" };
        }

        const addressToUpdate = {
            Id: addressId,
            Customer: loggedCustomer,
            FirstName: body.firstName,
            LastName: body.lastName,
            Email: body.email,
            Phone: body.phoneNumber,
            Country: utils.countryToId(body.country),
            City: utils.cityToId(body.city),
            AddressLine1: body.addressLine1,
            AddressLine2: body.addressLine2 || '',
            PostalCode: body.postalCode
        };

        try {
            this.customerAddressDao.update(addressToUpdate);

            const updatedAddress = this.customerAddressDao.findById(addressId);

            ctx.status = 200;
            return { success: true, address: updatedAddress };
        } catch (error) {
            console.error("Failed to update address:", error);
            ctx.status = 500;
            return { error: "Internal Server Error" };
        }
    }

    @Post("/account/details")
    public updateAccount(body: types.UpdateAccount) {
        const loggedCustomer = utils.mapCustomer(user.getName());

        const accountToUpdate = {
            Id: loggedCustomer,
            FirstName: body.firstName,
            LastName: body.lastName,
            Name: `${body.firstName} ${body.lastName}`,
            Phone: body.phoneNumber,
            Email: body.email,
        };

        try {
            this.customerDao.update(accountToUpdate);

            const updatedAccount = this.customerDao.findById(loggedCustomer);

            response.setStatus(response.OK);
            return { success: true, data: updatedAccount };
        } catch (error) {
            console.error("Failed to update account:", error);
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return { error: "Internal Server Error" };
        }
    }
}