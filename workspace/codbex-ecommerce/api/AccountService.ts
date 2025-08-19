import { Controller, Get, Put, Post, response } from "sdk/http";
import { query, sql } from 'sdk/db';
import * as utils from './utils/UtilsService';
import { user } from 'sdk/security';
import {
    AddressesResponse, ErrorResponse, Address, AccountDetails,
    SalesOrder, AddAddress, UpdateAddress, UpdateAccount
} from './types/Types';

import { CityRepository as CityDao } from "codbex-cities/gen/codbex-cities/dao/Settings/CityRepository";
import { CustomerAddressRepository as CustomerAddressDao } from "codbex-partners/gen/codbex-partners/dao/Customers/CustomerAddressRepository";
import { CustomerRepository as CustomerDao } from "codbex-partners/gen/codbex-partners/dao/Customers/CustomerRepository";

@Controller
class AccountService {

    private readonly customerAddressDao;
    private readonly customerDao;
    private readonly cityDao;

    constructor() {
        this.customerAddressDao = new CustomerAddressDao();
        this.customerDao = new CustomerDao();
        this.cityDao = new CityDao();
    }

    @Get("/account/addresses")
    public addressesData(): AddressesResponse | ErrorResponse {
        try {
            const customer = utils.mapCustomer(user.getName());

            if (!customer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Customer could not be resolved from session'
                );
            }
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

            const allAddresses = query.execute(addressQuery, [customer]) || [];

            if (allAddresses.length === 0) {
                response.setStatus(response.NOT_FOUND);
                return utils.createErrorResponse(
                    response.NOT_FOUND,
                    'Something went wrong',
                    'This customer has no saved addresses'
                );
            }

            const mappedAddresses = allAddresses.map(row => {
                const countryCode = utils.getCountryCode(row.CUSTOMERADDRESS_COUNTRY);
                const countryName = utils.getCountryName(row.CUSTOMERADDRESS_COUNTRY);
                const city = utils.mapCity(row.CUSTOMERADDRESS_CITY);

                return {
                    id: row.CUSTOMERADDRESS_ID,
                    firstName: row.CUSTOMERADDRESS_FIRSTNAME,
                    lastName: row.CUSTOMERADDRESS_LASTNAME,
                    country: countryCode,
                    countryName: countryName,
                    addressLine1: row.CUSTOMERADDRESS_ADRESSLINE1,
                    addressLine2: row.CUSTOMERADDRESS_ADDRESSLINE2,
                    city,
                    postalCode: row.CUSTOMERADDRESS_POSTALCODE,
                    phoneNumber: row.CUSTOMERADDRESS_PHONE,
                    email: row.CUSTOMERADDRESS_EMAIL,
                    addressType: row.CUSTOMERADDRESS_CUSTOMERADDRESSTYPE
                };
            });

            const shippingAddress: Address[] = mappedAddresses
                .filter(a => a.addressType === 1)
                .map(({ addressType, ...rest }) => rest);

            const billingAddress: Address[] = mappedAddresses
                .filter(a => a.addressType === 2)
                .map(({ addressType, ...rest }) => rest);

            return {
                shippingAddress,
                billingAddress
            };

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? error
            );
        }
    }

    @Get("/account/details")
    public accountData(): AccountDetails | ErrorResponse {
        try {
            const customerId = utils.mapCustomer(user.getName());

            if (!customerId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Could not resolve customer from session'
                );
            }

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

            if (customerResult.length === 0) {
                response.setStatus(response.NOT_FOUND);
                return utils.createErrorResponse(
                    response.NOT_FOUND,
                    'Something went wrong',
                    `No customer found with ID ${customerId}`
                );
            }

            const customer = customerResult[0];

            return {
                firstName: customer.CUSTOMER_FIRSTNAME,
                lastName: customer.CUSTOMER_LASTNAME,
                phoneNumber: customer.CUSTOMER_PHONE,
                email: customer.CUSTOMER_EMAIL,
                creationDate: customer.CUSTOMER_CREATEDAT
            };

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? String(error)
            );
        }
    }

    @Get("/account/orders")
    public ordersData(): SalesOrder[] | ErrorResponse {
        try {
            const customerId = utils.mapCustomer(user.getName());

            if (!customerId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Could not resolve customer from session'
                );
            }

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

            if (salesOrderResults.length === 0) {
                return [];
            }

            const salesOrders: SalesOrder[] = salesOrderResults.map(row => {
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

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? String(error)
            );
        }
    }

    @Get("/account/orders/:id")
    public orderDetails(_: any, ctx: any) {
        try {
            const loggedCustomer = utils.mapCustomer(user.getName());

            if (!loggedCustomer) {
                response.setStatus(response.UNAUTHORIZED);
                return utils.createErrorResponse(
                    response.UNAUTHORIZED,
                    "Unauthorized",
                    "Could not resolve logged-in customer"
                );
            }

            const orderId = ctx.pathParameters.id;

            if (!orderId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    "Missing order id",
                    "Order id is required"
                );
            }

            const customerFromOrder = utils.getCustomerFromOrder(orderId);

            if (!customerFromOrder) {
                response.setStatus(response.NOT_FOUND);
                return utils.createErrorResponse(
                    response.NOT_FOUND,
                    "Order not found",
                    `No order with id ${orderId}`
                );
            }

            if (customerFromOrder !== loggedCustomer) {
                response.setStatus(response.FORBIDDEN);
                return utils.createErrorResponse(
                    response.FORBIDDEN,
                    "Forbidden",
                    "You are not allowed to access this order"
                );
            }


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


            const salesOrderQuery = sql.getDialect()
                .select()
                .column('SALESORDER_SENTMETHOD')
                .column('SALESORDER_SHIPPINGADDRESS')
                .column('SALESORDER_BILLINGADDRESS')
                .column('SALESORDER_DATE')
                .column('SALESORDER_CURRENCY')
                .column('SALESORDER_TOTAL')
                .column('SALESORDER_STATUS')
                .column('SALESORDER_CONDITIONS')
                .from('CODBEX_SALESORDER')
                .where('SALESORDER_ID = ?')
                .build();

            const salesOrderResults = query.execute(salesOrderQuery, [loggedCustomer]);

            if (!salesOrderResults || salesOrderResults.length === 0) {
                response.setStatus(response.NOT_FOUND);
                return utils.createErrorResponse(
                    response.NOT_FOUND,
                    "Order not found",
                    `No sales order found with id ${orderId}`
                );
            }

            const allAddresses = query.execute(addressQuery, [loggedCustomer]).map(row => {
                const countryCode = utils.getCountryCode(row.CUSTOMERADDRESS_COUNTRY);
                const countryName = utils.getCountryName(row.CUSTOMERADDRESS_COUNTRY);
                const city = utils.mapCity(row.CUSTOMERADDRESS_CITY);

                return {
                    id: row.CUSTOMERADDRESS_ID,
                    firstName: row.CUSTOMERADDRESS_FIRSTNAME,
                    lastName: row.CUSTOMERADDRESS_LASTNAME,
                    country: countryCode,
                    countryName: countryName,
                    addressLine1: row.CUSTOMERADDRESS_ADRESSLINE1,
                    addressLine2: row.CUSTOMERADDRESS_ADDRESSLINE2,
                    city,
                    postalCode: row.CUSTOMERADDRESS_POSTALCODE,
                    phoneNumber: row.CUSTOMERADDRESS_PHONE,
                    email: row.CUSTOMERADDRESS_EMAIL,
                    addressType: row.CUSTOMERADDRESS_CUSTOMERADDRESSTYPE
                };
            });

            const shippingAddress: Address[] = allAddresses
                .filter(a => a.addressType === 1)
                .map(({ addressType, ...rest }) => rest);

            const billingAddress: Address[] = allAddresses
                .filter(a => a.addressType === 2)
                .map(({ addressType, ...rest }) => rest);

            return {
                id: String(orderId),
                paymentMethod: "Cash",
                shippingType: utils.mapSentMethod(salesOrderResults[0].SALESORDER_SENTMETHOD),
                shippingAddress: shippingAddress,
                billingAddress: billingAddress,
                creationDate: salesOrderResults[0].SALESORDER_DATE,
                totalAmount: {
                    amount: salesOrderResults[0].SALESORDER_TOTAL,
                    currency: utils.mapCurrencyCode(salesOrderResults[0].SALESORDER_CURRENCY)
                },
                status: utils.mapStatus(salesOrderResults[0].SALESORDER_STATUS),
                notes: salesOrderResults[0].SALESORDER_CONDITIONS,
                items: getSalesOrderItems(orderId)
            }
        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                "Something went wrong while fetching order details",
                error.message ?? String(error)
            );
        }
    }

    @Post("/account/address")
    public addAddress(body: AddAddress) {
        try {
            const loggedCustomer = utils.mapCustomer(user.getName());
            if (!loggedCustomer) {
                response.setStatus(response.UNAUTHORIZED);
                return { error: "Unauthorized: could not resolve logged-in customer" };
            }

            if (!body || !body.firstName || !body.lastName || !body.addressType || !body.country || !body.city) {
                response.setStatus(response.BAD_REQUEST);
                return { error: "Missing required fields" };
            }

            const addressType = utils.mapAddress(body.addressType);
            if (!addressType) {
                response.setStatus(response.BAD_REQUEST);
                return { error: `Invalid address type: ${body.addressType}` };
            }

            const countryId = utils.countryToId(body.country);
            if (!countryId) {
                response.setStatus(response.BAD_REQUEST);
                return { error: `Invalid country: ${body.country}` };
            }

            let cityId = utils.cityToId(body.city);
            if (!cityId) {
                try {
                    cityId = this.cityDao.create({ Name: body.city, Country: countryId });
                } catch (err) {
                    console.error("Failed to create city:", err);
                    response.setStatus(response.INTERNAL_SERVER_ERROR);
                    return { error: "Failed to create city" };
                }
            }

            const addressToAdd = {
                Customer: loggedCustomer,
                FirstName: body.firstName,
                LastName: body.lastName,
                Email: body.email,
                Phone: body.phoneNumber,
                Country: countryId,
                City: cityId,
                AddressLine1: body.addressLine1,
                AddressLine2: body.addressLine2 || '',
                PostalCode: body.postalCode,
                AddressType: addressType
            };

            const addressId = this.customerAddressDao.create(addressToAdd);
            if (!addressId) {
                response.setStatus(response.INTERNAL_SERVER_ERROR);
                return { error: "Failed to create address" };
            }

            const updatedAddress = this.customerAddressDao.findById(addressId);
            if (!updatedAddress) {
                response.setStatus(response.NOT_FOUND);
                return { error: "Address created but not found" };
            }

            response.setStatus(response.CREATED);
            return { success: true, address: updatedAddress };

        } catch (error: any) {
            console.error("Unexpected error while adding address:", error);
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return { error: "Internal Server Error" };
        }
    }

    @Put("/account/address/:id")
    public updateAddress(body: UpdateAddress, ctx: any) {
        const addressId = ctx.pathParameters.id;
        const userIdentifier = user.getName();
        try {
            const countryId = utils.countryToId(body.country);

            if (!countryId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    "Invalid country",
                    `Country "${body.country}" is not recognized`
                );
            }

            let cityId = utils.cityToId(body.city);

            if (cityId === undefined) {
                cityId = this.cityDao.create({ Name: body.city, Country: countryId });
                if (!cityId) {
                    response.setStatus(response.INTERNAL_SERVER_ERROR);
                    return utils.createErrorResponse(
                        response.INTERNAL_SERVER_ERROR,
                        "City creation failed",
                        `Failed to create city "${body.city}"`
                    );
                }
            }

            const customerFromAddress = utils.getCustomerFromAddress(addressId);

            if (!customerFromAddress) {
                response.setStatus(response.NOT_FOUND);
                return utils.createErrorResponse(
                    response.NOT_FOUND,
                    "Address not found",
                    `No address found with id ${addressId}`
                );
            }

            const loggedCustomer = utils.mapCustomer(userIdentifier);

            if (customerFromAddress !== loggedCustomer) {
                response.setStatus(response.FORBIDDEN);
                return utils.createErrorResponse(
                    response.FORBIDDEN,
                    "Forbidden",
                    "You are not allowed to update this address"
                );
            }

            const addressToUpdate = {
                Id: addressId,
                Customer: loggedCustomer,
                FirstName: body.firstName,
                LastName: body.lastName,
                Email: body.email,
                Phone: body.phoneNumber,
                Country: countryId,
                City: cityId,
                AddressLine1: body.addressLine1,
                AddressLine2: body.addressLine2 || '',
                PostalCode: body.postalCode
            };


            try {
                this.customerAddressDao.update(addressToUpdate);

                const updatedAddress = this.customerAddressDao.findById(addressId);
                response.setStatus(response.OK); return { success: true, address: updatedAddress };
            }
            catch (error) {
                console.error("Failed to update account:", error);
                response.setStatus(response.INTERNAL_SERVER_ERROR);
                return { error: "Internal Server Error" };
            }
        }
        catch (error) {
            console.error("Failed to update address:", error);
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "An unexpected error occurred while updating the account"
            );
        }
    }

    @Post("/account/details")
    public updateAccount(body: UpdateAccount) {
        try {
            const loggedCustomer = utils.mapCustomer(user.getName());

            if (!loggedCustomer) {
                response.setStatus(response.NOT_FOUND);
                return utils.createErrorResponse(
                    response.NOT_FOUND,
                    "Customer not found",
                    `No customer found for user "${userIdentifier}"`
                );
            }

            const customerEmail = utils.getCustomerEmail(loggedCustomer);

            if (!customerEmail) {
                response.setStatus(response.INTERNAL_SERVER_ERROR);
                return utils.createErrorResponse(
                    response.INTERNAL_SERVER_ERROR,
                    "Email retrieval failed",
                    `Could not retrieve email for customer "${loggedCustomer}"`
                );
            }

            const accountToUpdate = {
                Id: loggedCustomer,
                FirstName: body.firstName,
                LastName: body.lastName,
                Name: `${body.firstName} ${body.lastName}`,
                Phone: body.phoneNumber,
                Email: customerEmail
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
        } catch (error) {
            console.error("Failed to update account:", error);
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "An unexpected error occurred while updating the account"
            );
        }
    }
}

function getSalesOrderItems(salesorderId: number) {

    const salesOrderItemsQuery = sql.getDialect()
        .select()
        .column('SALESORDERITEM_ID')
        .column('SALESORDERITEM_QUANTITY')
        .from('CODBEX_SALESORDERITEM')
        .where('SALESORDERITEM_SALESORDER = ?')
        .build();

    const salesOrderItemResult = query.execute(salesOrderItemsQuery, [salesorderId]);

    return salesOrderItemResult.map(item => ({
        productId: item.SALESORDERITEM_ID,
        quantity: item.SALESORDERITEM_QUANTITY
    }));
}