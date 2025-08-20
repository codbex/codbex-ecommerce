import { query, sql } from 'sdk/db';
import * as utils from './UtilsService';
import { Address } from '../types/Types'

export function mapAddresses(allAddresses): { shippingAddress: Address[]; billingAddress: Address[]; } {

    const mappedAddresses = allAddresses.map(row => {
        const countryCode = utils.getCountryCode(row.CUSTOMERADDRESS_COUNTRY);
        const countryName = utils.getCountryName(row.CUSTOMERADDRESS_COUNTRY);
        const city = utils.getCityName(row.CUSTOMERADDRESS_CITY);

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
}

export function getSalesOrderItems(salesorderId: number) {

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