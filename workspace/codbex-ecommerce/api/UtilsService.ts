import { query, sql } from 'sdk/db';

function getColumnByWhere<T>(
    table: string,
    column: string,
    whereClause: string,
    params: any[]
): T {
    const q = sql.getDialect()
        .select()
        .column(column)
        .from(table)
        .where(whereClause)
        .build();

    const result = query.execute(q, params);
    return result[0][column] as T;
}

export function getCustomerFromAddress(addressId: number) {
    return getColumnByWhere<number>('CODBEX_CUSTOMERADDRESS', 'CUSTOMERADDRESS_CUSTOMER', 'CUSTOMERADDRESS_ID = ?', [addressId]);
}

export function mapCustomer(identifier: string) {
    return getColumnByWhere<number>('CODBEX_CUSTOMER', 'CUSTOMER_ID', 'CUSTOMER_IDENTIFIER = ?', [identifier]);
}

export function mapStatus(statusId: number) {
    return getColumnByWhere<string>('CODBEX_SALESORDERSTATUS', 'SALESORDERSTATUS_NAME', 'SALESORDERSTATUS_ID = ?', [statusId]);
}

export function mapCurrencyCode(currencyId: number) {
    return getColumnByWhere<string>('CODBEX_CURRENCY', 'CURRENCY_CODE', 'CURRENCY_ID = ?', [currencyId]);
}

export function countryToId(countryName: string) {
    return getColumnByWhere<number>('CODBEX_COUNTRY', 'COUNTRY_ID', 'COUNTRY_NAME = ?', [countryName]);
}

export function mapCountry(countryId: number) {
    return getColumnByWhere<string>('CODBEX_COUNTRY', 'COUNTRY_NAME', 'COUNTRY_ID = ?', [countryId]);
}

export function cityToId(cityName: string) {
    return getColumnByWhere<number>('CODBEX_CITY', 'CITY_ID', 'CITY_NAME = ?', [cityName]);
}

export function mapCity(cityId: number) {
    return getColumnByWhere<string>('CODBEX_CITY', 'CITY_NAME', 'CITY_ID = ?', [cityId]);
}