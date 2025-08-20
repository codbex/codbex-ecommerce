import { query, sql } from 'sdk/db';
import { uuid } from "sdk/utils";
import { ErrorResponse } from '../types/Types'

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

function getColumnByWhere<T>(
    table: string,
    column: string,
    whereClause: string,
    params: any[]
): T | undefined {
    const q = sql.getDialect()
        .select()
        .column(column)
        .from(table)
        .where(whereClause)
        .build();

    const result = query.execute(q, params);
    return result.length === 0 ? undefined : result[0][column] as T;
}

export function getCustomerByAddress(addressId: number) {
    return getColumnByWhere<number>('CODBEX_CUSTOMERADDRESS', 'CUSTOMERADDRESS_CUSTOMER', 'CUSTOMERADDRESS_ID = ?', [addressId]);
}

export function getCustomerByIdentifier(identifier: string) {
    return getColumnByWhere<number>('CODBEX_CUSTOMER', 'CUSTOMER_ID', 'CUSTOMER_IDENTIFIER = ?', [identifier]);
}

export function getCustomerEmail(id: number) {
    return getColumnByWhere<string>('CODBEX_CUSTOMER', 'CUSTOMER_EMAIL', 'CUSTOMER_ID = ?', [id]);
}

export function getSalesOrderStatus(statusId: number) {
    return getColumnByWhere<string>('CODBEX_SALESORDERSTATUS', 'SALESORDERSTATUS_NAME', 'SALESORDERSTATUS_ID = ?', [statusId]);
}

export function getCurrencyCode(currencyId: number) {
    return getColumnByWhere<string>('CODBEX_CURRENCY', 'CURRENCY_CODE', 'CURRENCY_ID = ?', [currencyId]);
}

export function getCountryId(countryName: string) {
    return getColumnByWhere<number>('CODBEX_COUNTRY', 'COUNTRY_ID', 'COUNTRY_CODE3 = ?', [countryName]);
}

export function getCountryCode(countryId: number) {
    return getColumnByWhere<string>('CODBEX_COUNTRY', 'COUNTRY_CODE3', 'COUNTRY_ID = ?', [countryId]);
}

export function getCountryName(countryId: number) {
    return getColumnByWhere<string>('CODBEX_COUNTRY', 'COUNTRY_NAME', 'COUNTRY_ID = ?', [countryId]);
}

export function getCityId(cityName: string) {
    const id = getColumnByWhere<number>('CODBEX_CITY', 'CITY_ID', 'CITY_NAME = ?', [cityName]);
    return id;
}

export function getCityName(cityId: number) {
    return getColumnByWhere<string>('CODBEX_CITY', 'CITY_NAME', 'CITY_ID = ?', [cityId]);
}

export function getSentMethodName(sentMethodId: number) {
    return getColumnByWhere<string>('CODBEX_SENTMETHOD', 'SENTMETHOD_NAME', 'SENTMETHOD_ID = ?', [sentMethodId]);
}

export function getAddressId(addressName: string) {
    return getColumnByWhere<number>('CODBEX_CUSTOMERADDRESSTYPE', 'CUSTOMERADDRESSTYPE_ID', 'CUSTOMERADDRESSTYPE_NAME = ?', [addressName]);
}

export function getCustomerByOrder(orderId: number) {
    return getColumnByWhere<number>('CODBEX_SALESORDER', 'SALESORDER_CUSTOMER', 'SALESORDER_ID = ?', [orderId]);
}