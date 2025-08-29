import { uuid } from "sdk/utils";
import { ErrorResponse } from '../types/Types'

import { CustomerAddressRepository } from "codbex-partners/gen/codbex-partners/dao/Customers/CustomerAddressRepository";
import { CustomerAddressTypeRepository } from "codbex-partners/gen/codbex-partners/dao/Settings/CustomerAddressTypeRepository";
import { CustomerRepository } from "codbex-partners/gen/codbex-partners/dao/Customers/CustomerRepository";
import { SalesOrderStatusRepository } from "codbex-orders/gen/codbex-orders/dao/Settings/SalesOrderStatusRepository";
import { SalesOrderRepository } from "codbex-orders/gen/codbex-orders/dao/SalesOrder/SalesOrderRepository";
import { SentMethodRepository } from "codbex-methods/gen/codbex-methods/dao/Settings/SentMethodRepository";
import { CurrencyRepository } from "codbex-currencies/gen/codbex-currencies/dao/Settings/CurrencyRepository";
import { CountryRepository } from "codbex-countries/gen/codbex-countries/dao/Settings/CountryRepository";
import { CityRepository } from "codbex-cities/gen/codbex-cities/dao/Settings/CityRepository";

const CustomerDao = new CustomerRepository();
const SentMethodDao = new SentMethodRepository();
const CurrencyDao = new CurrencyRepository();
const SalesOrderStatusDao = new SalesOrderStatusRepository();
const SalesOrderDao = new SalesOrderRepository();
const CountryDao = new CountryRepository();
const CityDao = new CityRepository();
const CustomerAddressDao = new CustomerAddressRepository();
const CustomerAddressTypeDao = new CustomerAddressTypeRepository();

export function createErrorResponse(
    statusCode: number,
    message: string,
    originalError?: unknown
): ErrorResponse {
    const errorId = uuid.random();

    if (originalError) {
        console.error(`Error occurred '${errorId}' :`, originalError);
    } else {
        console.error(`Error occurred '${errorId}' : ${message}`);
    }

    return {
        errorType: String(statusCode),
        errorMessage: message,
        errorCauses: [
            { errorMessage: `Please contact us providing the following error ID '${errorId}'` },
        ],
    };
}

// function getColumnByWhere<T>(
//     table: string,
//     column: string,
//     whereClause: string,
//     params: any[]
// ): T | undefined {
//     const q = sql.getDialect()
//         .select()
//         .column(column)
//         .from(table)
//         .where(whereClause)
//         .build();

//     const result = query.execute(q, params);
//     return result.length === 0 ? undefined : result[0][column] as T;
// }

export function getCustomerByAddress(addressId: number) {
    return CustomerAddressDao.findById(addressId).Customer;
    // return getColumnByWhere<number>('CODBEX_CUSTOMERADDRESS', 'CUSTOMERADDRESS_CUSTOMER', 'CUSTOMERADDRESS_ID = ?', [addressId]);
}

export function getCustomerByIdentifier(identifier: string) {
    return CustomerDao.findAll({
        $filter: {
            equals: {
                Identifier: identifier
            }
        }
    })[0].Id;
    // return getColumnByWhere<number>('CODBEX_CUSTOMER', 'CUSTOMER_ID', 'CUSTOMER_IDENTIFIER = ?', [identifier]);
}

export function getCustomerEmail(id: number) {
    return CustomerDao.findById(id).Email;
}

export function getSalesOrderStatus(statusId: number) {
    return SalesOrderStatusDao.findById(statusId).Name;
}
export function getCurrencyCode(currencyId: number) {
    return CurrencyDao.findById(currencyId).Code;
}

export function getCountryId(code3: string) {
    return CountryDao.findAll({
        $filter: {
            equals: {
                Code3: code3
            }
        }
    })[0].Id;
}

export function getCountryCode(countryId: number) {
    return CountryDao.findById(countryId).Code3;
}

export function getCountryName(countryId: number) {
    return CountryDao.findById(countryId).Name;
}

export function getCityId(cityName: string) {
    return CityDao.findAll({
        $filter: {
            equals: {
                Name: cityName
            }
        }
    })[0].Id;
}

export function getCityName(cityId: number) {
    return CityDao.findById(cityId).Name;
}

export function getSentMethodName(sentMethodId: number) {
    return SentMethodDao.findById(sentMethodId).Name;
}

export function getAddressId(addressName: string) {
    return CustomerAddressTypeDao.findAll({
        $filter: {
            equals: {
                Name: addressName
            }
        }
    })[0].Id;
}

export function getCustomerByOrder(orderId: number) {
    return SalesOrderDao.findById(orderId).Customer;
}