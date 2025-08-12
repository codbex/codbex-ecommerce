import { Controller, Get } from "sdk/http";
import { query, sql } from 'sdk/db';

import { user } from 'sdk/security';

type Money = {
    amount: number;
    currency: string;
};

@Controller
class AccountService {

    @Get("/account/addresses")
    public addressesData() {

        const userIdentifier = user.getName();

        console.log("user get name");
        console.log(userIdentifier);
        
        console.log("sec token");
        console.log(user.getSecurityToken());

        const addressQuery = sql.getDialect()
            .select()
            .column('CUSTOMERADDRESS_ID')
            .column('CUSTOMERADDRESS_ADRESSLINE1')
            .column('CUSTOMERADDRESS_ADDRESSLINE2')
            // .column('CUSTOMERADDRESS_COMPANY')
            .column('CUSTOMERADDRESS_COUNTRY')
            .column('CUSTOMERADDRESS_CITY')
            .column('CUSTOMERADDRESS_POSTALCODE')
            .column('CUSTOMERADDRESS_CUSTOMER')
            .column('CUSTOMERADDRESS_CUSTOMERADDRESSTYPE')
            .from('CODBEX_CUSTOMERADDRESS')
            .where('CUSTOMERADDRESS_CUSTOMERADDRESSTYPE = ?')
            .where('CUSTOMERADDRESS_CUSTOMER = 1')
            .build();

        const customerQuery = sql.getDialect()
            .select()
            .column('CUSTOMER_FIRSTNAME')
            .column('CUSTOMER_LASTNAME')
            .column('CUSTOMER_EMAIL')
            .column('CUSTOMER_PHONE')
            .from('CODBEX_CUSTOMER')
            .where('CUSTOMER_ID = 1')
            .build();

        const customerResult = query.execute(customerQuery);

        const billingAddress = query.execute(addressQuery, [2]).map(row => {
            console.log('ee');

            const country = mapCountry(row.CUSTOMERADDRESS_COUNTRY);
            const city = mapCity(row.CUSTOMERADDRESS_CITY);

            return {
                id: row.CUSTOMERADDRESS_ID,
                firstName: customerResult[0].CUSTOMER_FIRSTNAME,
                lastName: customerResult[0].CUSTOMER_LASTNAME,
                // companyName: string;
                country: country,
                addressLine1: row.CUSTOMERADDRESS_ADRESSLINE1,
                addressLine2: row.CUSTOMERADDRESS_ADDRESSLINE2,
                city: city,
                postalCode: row.CUSTOMERADDRESS_POSTALCODE,
                phoneNumber: customerResult[0].CUSTOMER_PHONE,
                email: customerResult[0].CUSTOMER_EMAIL
            };
        });

        const shippingAddress = query.execute(addressQuery, [1]).map(row => {
            const country = mapCountry(row.CUSTOMERADDRESS_COUNTRY);
            const city = mapCity(row.CUSTOMERADDRESS_CITY);

            return {
                id: row.CUSTOMERADDRESS_ID,
                firstName: customerResult[0].CUSTOMER_FIRSTNAME,
                lastName: customerResult[0].CUSTOMER_LASTNAME,
                // companyName: string;
                country: country,
                addressLine1: row.CUSTOMERADDRESS_ADRESSLINE1,
                addressLine2: row.CUSTOMERADDRESS_ADDRESSLINE2,
                city: city,
                postalCode: row.CUSTOMERADDRESS_POSTALCODE,
                phoneNumber: customerResult[0].CUSTOMER_PHONE,
                email: customerResult[0].CUSTOMER_EMAIL
            };
        });

        return {
            shippingAddress: shippingAddress,
            billingAddress: billingAddress
        };
    }

    @Get("/account/details")
    public accountData() {
        const customerQuery = sql.getDialect()
            .select()
            .column('CUSTOMER_FIRSTNAME')
            .column('CUSTOMER_LASTNAME')
            .column('CUSTOMER_EMAIL')
            .column('CUSTOMER_PHONE')
            .column('CUSTOMER_CREATEDAT')
            .from('CODBEX_CUSTOMER')
            .where('CUSTOMER_ID = 1')
            .build();

        const customerResult = query.execute(customerQuery);

        return {
            firstName: customerResult[0].CUSTOMER_FIRSTNAME,
            lastName: customerResult[0].CUSTOMER_LASTNAME,
            phoneNumber: customerResult[0].CUSTOMER_PHONE,
            email: customerResult[0].CUSTOMER_EMAIL,
            creationDate: customerResult[0].CUSTOMER_CREATEDAT
        };
    }

    @Get("/account/orders")
    public ordersData() {

        const salesOrderQuery = sql.getDialect()
            .select()
            .column('SALESORDER_ID')
            .column('SALESORDER_DATE')
            .column('SALESORDER_STATUS')
            .column('SALESORDER_CURRENCY')
            .column('SALESORDER_TOTAL')
            .from('CODBEX_SALESORDER')
            .where('SALESORDER_CUSTOMER = 1')
            .build();

        const salesOrderResults = query.execute(salesOrderQuery, []);

        const salesOrders = salesOrderResults.map(row => {
            const currencyCode = mapCurrencyCode(row.SALESORDER_CURRENCY);
            const status = mapStatus(row.SALESORDER_STATUS);

            return {
                id: String(row.SALESORDER_ID),
                creationDate: new Date(row.SALESORDER_DATE).toISOString(),
                status: status,
                totalAmount: {
                    amount: row.SALESORDER_TOTAL,
                    currency: currencyCode,
                } as Money
            };
        });

        return salesOrders;
    }
}

function mapStatus(statusId: number) {
    const salesOrderStatusQuery = sql.getDialect()
        .select()
        .column('SALESORDERSTATUS_NAME')
        .from('CODBEX_SALESORDERSTATUS')
        .where(`SALESORDERSTATUS_ID = ?`)
        .build();

    const salesOrderStatusResult = query.execute(salesOrderStatusQuery, [statusId]);

    return salesOrderStatusResult[0].SALESORDERSTATUS_NAME;
}

function mapCurrencyCode(currencyId: number) {

    const currencyQuery = sql.getDialect()
        .select()
        .column('CURRENCY_CODE')
        .from('CODBEX_CURRENCY')
        .where(`CURRENCY_ID = ?`)
        .build();

    const currencyResult = query.execute(currencyQuery, [currencyId]);

    return currencyResult[0].CURRENCY_CODE;
}


function mapCountry(countryId: number) {

    const countryQuery = sql.getDialect()
        .select()
        .column('COUNTRY_NAME')
        .from('CODBEX_COUNTRY')
        .where(`COUNTRY_ID = ?`)
        .build();

    const countryResult = query.execute(countryQuery, [countryId]);

    return countryResult[0].COUNTRY_NAME;
}

function mapCity(cityId: number) {

    const cityQuery = sql.getDialect()
        .select()
        .column('CITY_NAME')
        .from('CODBEX_CITY')
        .where(`CITY_ID = ?`)
        .build();

    const cityResult = query.execute(cityQuery, [cityId]);

    return cityResult[0].CITY_NAME;
}
