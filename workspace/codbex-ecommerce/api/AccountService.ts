import { Controller, Get, Put, Post, response } from "sdk/http";
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
import { SalesOrderRepository as SalesOrderDao } from "codbex-orders/gen/codbex-orders/dao/SalesOrder/SalesOrderRepository";

@Controller
class AccountService {

    private readonly customerAddressDao;
    private readonly customerDao;
    private readonly cityDao;
    private readonly salesOrderDao;

    constructor() {
        this.customerAddressDao = new CustomerAddressDao();
        this.customerDao = new CustomerDao();
        this.cityDao = new CityDao();
        this.salesOrderDao = new SalesOrderDao();
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
                email: createdCustomer.Email,
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

            const customer = this.customerDao.findById(loggedCustomer);

            if (!customer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Customer could not be resolved from session'
                );
            }

            const customerAddresses = this.customerAddressDao.findAll({
                $filter: {
                    equals: {
                        Customer: loggedCustomer
                    }
                }
            });

            if (customerAddresses.length === 0) {
               return [];
            }

            const mappedAddresses = accountUtils.mapAddresses(customerAddresses);

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

            const customer = this.customerDao.findById(customerId);

            if (!customer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `Could not resolve customer from session: ${customerId}`
                );
            }

            return {
                firstName: customer.FirstName,
                lastName: customer.LastName,
                phoneNumber: customer.Phone,
                email: customer.Email,
                creationDate: customer.CreatedAt
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

            const customer = this.customerDao.findById(customerId);

            if (!customer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    'Could not resolve customer from session'
                );
            }

            const salesOrderResults = this.salesOrderDao.findAll({
                $filter: {
                    equals: {
                        Customer: customerId
                    }
                }
            });

            if (salesOrderResults.length === 0) {
                return [];
            }

            const salesOrders: SalesOrder[] = salesOrderResults.map(row => {
                const currencyCode = utils.getCurrencyCode(row.Currency);
                const status = utils.getSalesOrderStatus(row.Status);

                return {
                    id: String(row.Id),
                    creationDate: new Date(row.Date).toISOString(),
                    status: status,
                    totalAmount: {
                        amount: row.Total,
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

            const customer = this.customerDao.findById(loggedCustomer);

            if (!customer) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `Could not resolve customer from session ${loggedCustomer}`
                );
            }

            const orderId = ctx.pathParameters.id;

            if (!orderId) {
                response.setStatus(response.UNPROCESSABLE_CONTENT);
                return utils.createErrorResponse(
                    response.UNPROCESSABLE_CONTENT,
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

            const salesOrder = this.salesOrderDao.findById(orderId);

            if (!salesOrder) {
                response.setStatus(response.BAD_REQUEST);
                return utils.createErrorResponse(
                    response.BAD_REQUEST,
                    'Something went wrong',
                    `No sales order found with id ${orderId}`
                );
            }

            const billingAddress = this.customerAddressDao.findById(salesOrder.BillingAddress);
            const shippingAddress = this.customerAddressDao.findById(salesOrder.ShippingAddress);

            const mappedAddresses = accountUtils.mapAddresses([billingAddress, shippingAddress]);

            return {
                id: String(orderId),
                paymentMethod: "Cash",
                shippingType: utils.getSentMethodName(salesOrder.SentMethod),
                shippingAddress: mappedAddresses.shippingAddress[0],
                billingAddress: mappedAddresses.billingAddress[0],
                creationDate: salesOrder.Date,
                totalAmount: {
                    amount: salesOrder.Total,
                    currency: utils.getCurrencyCode(salesOrder.Currency)
                },
                status: utils.getSalesOrderStatus(salesOrder.Status),
                notes: salesOrder.Conditions,
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
