import { Controller, Get, Put, Post, response } from "sdk/http";
import { query, sql } from 'sdk/db';
import * as utils from './utils/UtilsService';
import * as accountUtils from './utils/AccountUtilsService';
import { user } from 'sdk/security';
import {
    AddressesResponse, ErrorResponse, AccountDetails, AddAccount,
    SalesOrder, AddAddress, UpdateAddress, UpdateAccount, Money
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

    @Post("/account/register")
    public registerUser(body: AddAccount) {
        try {

            if (!body || !body.firstName || !body.lastName || !body.phoneNumber || !body.email || !body.userId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Missing required fields'
                );
            }

            const userWithSameId = this.customerDao.findAll({
                $filter: {
                    equals: {
                        Identifier: body.userId
                    }
                }
            });

            if (userWithSameId.length !== 0) {
                response.setStatus(response.CONFLICT);
                return utils.createErrorResponse(
                    response.CONFLICT,
                    'Something went wrong',
                    `Customer with id ${body.userId} already exists!`
                );
            }

            const customerToAdd = {
                FirstName: body.firstName,
                LastName: body.lastName,
                Email: body.email,
                Phone: body.phoneNumber,
                Identifier: body.userId
            };

            let customerId;

            try {
                customerId = this.customerDao.create(customerToAdd);
            }
            catch (error: any) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `Cannot create customer: ${error.message}`
                );
            }

            const createdCustomer = this.customerDao.findById(customerId);

            response.setStatus(response.CREATED);
            return {
                firstName: createdCustomer.FirstName,
                lastName: createdCustomer.LastName,
                phoneNumber: createdCustomer.Phone,
                email: createdCustomer.EmailL,
                creationDate: createdCustomer.CreatedAt
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

    @Get("/account/addresses")
    public addressesData(): AddressesResponse | ErrorResponse {
        try {
            const loggedCustomer = utils.getCustomerByIdentifier(user.getName());

            if (!loggedCustomer) {
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

            const allAddresses = query.execute(addressQuery, [loggedCustomer]) || [];

            if (allAddresses.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'This customer has no saved addresses'
                );
            }

            const mappedAddresses = accountUtils.mapAddresses(allAddresses);

            return mappedAddresses;

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
            const customerId = utils.getCustomerByIdentifier(user.getName());

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
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No customer found with ID ${customerId}`
                );
            }

            const loggedCustomer = customerResult[0];

            return {
                firstName: loggedCustomer.CUSTOMER_FIRSTNAME,
                lastName: loggedCustomer.CUSTOMER_LASTNAME,
                phoneNumber: loggedCustomer.CUSTOMER_PHONE,
                email: loggedCustomer.CUSTOMER_EMAIL,
                creationDate: loggedCustomer.CUSTOMER_CREATEDAT
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

    @Get("/account/orders")
    public ordersData(): SalesOrder[] | ErrorResponse {
        try {
            const customerId = utils.getCustomerByIdentifier(user.getName());

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
                const currencyCode = utils.getCurrencyCode(row.SALESORDER_CURRENCY);
                const status = utils.getSalesOrderStatus(row.SALESORDER_STATUS);

                return {
                    id: String(row.SALESORDER_ID),
                    creationDate: new Date(row.SALESORDER_DATE).toISOString(),
                    status: status,
                    totalAmount: {
                        amount: row.SALESORDER_TOTAL,
                        currency: currencyCode
                    } as Money
                };
            });

            return salesOrders;

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? error
            );
        }
    }

    @Get("/account/orders/:id")
    public orderDetails(_: any, ctx: any) {
        try {
            const loggedCustomer = utils.getCustomerByIdentifier(user.getName());

            if (!loggedCustomer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Could not resolve customer from session'
                );
            }

            const orderId = ctx.pathParameters.id;

            if (!orderId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Order id is required'
                );
            }

            const customerFromOrder = utils.getCustomerByOrder(orderId);

            if (!customerFromOrder) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No customer found from order with id ${orderId}`
                );
            }

            if (customerFromOrder !== loggedCustomer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Attempt to access another user order'
                );
            }

            const billingAddressQuery = sql.getDialect()
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
                .leftJoin('CODBEX_SALESORDER', 'SALESORDER_BILLINGADDRESS = CUSTOMERADDRESS_ID')
                .where('SALESORDER_ID = ?')
                .build();

            const shippingAddressQuery = sql.getDialect()
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
                .leftJoin('CODBEX_SALESORDER', 'SALESORDER_SHIPPINGADDRESS = CUSTOMERADDRESS_ID')
                .where('SALESORDER_ID = ?')
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

            const salesOrderResults = query.execute(salesOrderQuery, [orderId]);

            if (!salesOrderResults || salesOrderResults.length === 0) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No sales order found with id ${orderId}`
                );
            }

            const billingAddressResult = query.execute(billingAddressQuery, [orderId]);
            const shippingAddressResult = query.execute(shippingAddressQuery, [orderId]);
            const mappedAddresses = accountUtils.mapAddresses([billingAddressResult[0], shippingAddressResult[0]]);

            return {
                id: String(orderId),
                paymentMethod: "Cash",
                shippingType: utils.getSentMethodName(salesOrderResults[0].SALESORDER_SENTMETHOD),
                shippingAddress: mappedAddresses.shippingAddress,
                billingAddress: mappedAddresses.billingAddress,
                creationDate: salesOrderResults[0].SALESORDER_DATE,
                totalAmount: {
                    amount: salesOrderResults[0].SALESORDER_TOTAL,
                    currency: utils.getCurrencyCode(salesOrderResults[0].SALESORDER_CURRENCY)
                },
                status: utils.getSalesOrderStatus(salesOrderResults[0].SALESORDER_STATUS),
                notes: salesOrderResults[0].SALESORDER_CONDITIONS,
                items: accountUtils.getSalesOrderItems(orderId)
            }
        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? error
            );
        }
    }

    @Post("/account/address")
    public addAddress(body: AddAddress) {
        try {
            const loggedCustomer = utils.getCustomerByIdentifier(user.getName());

            if (!loggedCustomer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Could not resolve customer from session'
                );
            }

            if (!body || !body.firstName || !body.lastName || !body.addressType || !body.country || !body.city) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Missing required fields'
                );
            }

            const addressType = utils.getAddressId(body.addressType);
            if (!addressType) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `Invalid address type: ${body.addressType}`
                );
            }

            const countryId = utils.getCountryId(body.country);
            if (!countryId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `Invalid country: ${body.country}`
                );
            }

            let cityId = utils.getCityId(body.city);
            if (!cityId) {
                cityId = this.cityDao.create({ Name: body.city, Country: countryId });
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

            let addressId;

            try {
                addressId = this.customerAddressDao.create(addressToAdd);
            }
            catch (error: any) {
                response.setStatus(response.INTERNAL_SERVER_ERROR);
                return utils.createErrorResponse(
                    response.INTERNAL_SERVER_ERROR,
                    'Something went wrong',
                    `Failed to create address: ${error.message}`
                );
            }

            const updatedAddress = this.customerAddressDao.findById(addressId);
            if (!updatedAddress) {
                response.setStatus(response.NOT_FOUND);
                return utils.createErrorResponse(
                    response.INTERNAL_SERVER_ERROR,
                    'Something went wrong',
                    'Address created but not found'
                );
            }

            response.setStatus(response.CREATED);
            return { success: true, address: updatedAddress };

        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? error
            );
        }
    }

    @Put("/account/address/:id")
    public updateAddress(body: UpdateAddress, ctx: any) {
        const addressId = ctx.pathParameters.id;
        const userIdentifier = user.getName();

        try {
            const countryId = utils.getCountryId(body.country);

            if (!countryId) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `Country "${body.country}" is not recognized`
                );
            }

            let cityId = utils.getCityId(body.city);

            if (cityId === undefined) {
                cityId = this.cityDao.create({ Name: body.city, Country: countryId });
            }

            const customerFromAddress = utils.getCustomerByAddress(addressId);

            if (!customerFromAddress) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No address found with id ${addressId}`
                );
            }

            const loggedCustomer = utils.getCustomerByIdentifier(userIdentifier);

            if (customerFromAddress !== loggedCustomer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Attempt to update another user address'
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


            this.customerAddressDao.update(addressToUpdate);
            const updatedAddress = this.customerAddressDao.findById(addressId);

            response.setStatus(response.OK); return { success: true, address: updatedAddress };
        }
        catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? error
            );
        }
    }

    @Post("/account/details")
    public updateAccount(body: UpdateAccount) {
        const userIdentifier = user.getName();

        try {
            const loggedCustomer = utils.getCustomerByIdentifier(userIdentifier);

            if (!loggedCustomer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No customer found for user "${userIdentifier}"`
                );
            }

            const customerEmail = utils.getCustomerEmail(loggedCustomer);

            if (!customerEmail) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
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

            this.customerDao.update(accountToUpdate);
            const updatedAccount = this.customerDao.findById(loggedCustomer);

            response.setStatus(response.OK);
            return { success: true, data: updatedAccount };
        } catch (error: any) {
            response.setStatus(response.INTERNAL_SERVER_ERROR);
            return utils.createErrorResponse(
                response.INTERNAL_SERVER_ERROR,
                'Something went wrong',
                error.message ?? error
            );
        }
    }
}
